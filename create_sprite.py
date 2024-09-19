import argparse
import os
from PIL import Image, ImageChops, ImageMath
from update_directory import update_directory

def create_sprite(name, width=-1, differentiator='RGB', fallback=False):
    '''
    Generates a palettized image from input images of the same base name.
    The inputs can be: raw image, base colors, color map, and detail layer
                   or: shadows, highlights, color map, and detail layer.
    Parameters:
    - name
      base name of input files
    - width
      <0: crop and downscale such that diagonal is ~666 (preserve size if already <666)
      =0: preserve size
      >0: resize to specified width
    - differentiator
      ='R': only consider the red channel when making the color map
      ='RGB': differentiate all colors when making the color map
    - fallback
      True: run with color map in palette mode
      False: run normally with color map unmodified
    '''
    area = Image.open('{}_area.png'.format(name)).convert('RGBA') # color map
    if fallback:
        area = area.convert('P').convert('RGBA')
    line = Image.open('{}_line.png'.format(name)).convert('RGBA') # detail layer
    try:
        shadow = Image.open('{}_shadow.png'.format(name)).convert('RGBA')
        highlight = Image.open('{}_highlight.png'.format(name)).convert('RGBA')
    except:
        raw = Image.open('{}_raw.png'.format(name)).convert('RGBA') # raw image
        base = Image.open('{}_base.png'.format(name)).convert('RGBA') # base colors
        shadow = ImageChops.subtract(base, raw)
        highlight = ImageChops.subtract(raw, base)
    
    if differentiator == 'R':
        r = area.getchannel(0).convert('L')
    elif differentiator == 'RGB':
        copy = Image.new('RGB', area.size)
        copy.paste(area, mask=area) # paste removes color info in transparent areas
        data = copy.getdata()
        colors1 = {(a, b, c, 0) for a, b, c in data} - {(0, 0, 0, 0)}
        colors2 = set()
        colormap = {0: (0, 0, 0)}
        while len(colors1) > 0 and len(colormap) < 256:
            for a, b, c, d in colors1:
                if a not in colormap:
                    colormap[a] = ((a - d) % 256, b, c)
                else:
                    colors2.add(((a + 1) % 256, b, c, d + 1))
            colors1 = colors2.copy()
            colors2.clear()
        if len(colors1):
            print('Color limit exceeded; number of excess colors:', len(colors1))
            print('Trying again with color map in palette mode.')
            return create_sprite(name, width, differentiator, True)
        colormapinverse = {colormap[i]: i for i in colormap}
        rdata = [colormapinverse[i] for i in data]
        r = Image.new('L', area.size)
        r.putdata(rdata)
    else:
        print('Unsupported differentiator:', differentiator)
        return

    g = ImageMath.lambda_eval(
        lambda _: _['convert'](0xff - _['line'], 'L'),
        line=line.getchannel(3).convert('L')
    )
    b = ImageMath.lambda_eval(
        lambda _: _['convert'](0xff - (_['area'] > 0) * (_['shadow'] * (0xff - 0x33) / 0x80) + (_['area'] > 0) * ((_['highlight'] - 0x33) * 0x33 / 0x40), 'L'),
        area=area.convert('L'),
        shadow=shadow.convert('L'),
        highlight=highlight.convert('L')
    )

    if width < 0:
        diagonal_max = 666
        diagonal = (r.width ** 2 + r.height ** 2) ** 0.5
        if diagonal > diagonal_max:
            bbox = ImageMath.lambda_eval(
                lambda _: _['convert'](_['r'] + max(0, 0xff - _['g']) + max(0, 0xff - _['b']), 'L'),
                r=r, g=g, b=b
            ).getbbox()
            r = r.crop(bbox)
            g = g.crop(bbox)
            b = b.crop(bbox)
            diagonal = (r.width ** 2 + r.height ** 2) ** 0.5
        width = min(r.width, int(r.width * diagonal_max / diagonal))
    newsize = tuple(int(x * width / r.width) for x in r.size)

    if width == 0 or width == r.width:
        rgb = Image.merge('RGB', (r, g, b))
    else:
        rgb = Image.merge('RGB', (
            r.resize(newsize, Image.NEAREST),
            g.resize(newsize), # set resample to Image.NEAREST if area has gaps
            b.resize(newsize)
        ))

    path = 'sprite/{}.png'.format(name.lower())
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rgb.save(path)
    print('Success\n')

def auto(directory='custom', skip=True):
    '''Runs create_sprite with default settings for all files in the specified directory.'''
    names = set()
    for user in os.listdir(directory):
        for filename in os.listdir('{}/{}'.format(directory, user)):
            character = '_'.join(filename.split('_')[:-1])
            name = '{}/{}/{}'.format(directory, user, character)
            if name not in names:
                names.add(name)
                if skip and os.path.isfile('sprite/{}.png'.format(name)):
                    print('Skipping:', name)
                else:
                    try:
                        print('Creating sprite for:', name)
                        create_sprite(name)
                    except Exception as e:
                        print(e, '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-n', '--name', type=str, help='base name (processes entire `custom` folder if empty)')
    parser.add_argument('-r', '--rerun', action='store_false', help='do not skip existing sprites (if --name is empty)')
    parser.add_argument('-w', '--width', type=int, default=-1, help='width (px)')
    parser.add_argument('-d', '--differentiator', type=str, default='RGB', help='differentiator (R or RGB)')
    args = parser.parse_args()
    if args.name:
        create_sprite(args.name, args.width, args.differentiator)
    else:
        auto('custom', args.rerun)
    update_directory()
