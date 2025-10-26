function file2Line() {
    for (var x = 0; x < data.data.length; x++) {
        for (var y = 0; y < data.data[x].length; y++) {
        }
    }
    return line;
}

function loadImage() {
}

function subtract(im, jm) {
    return jm - im;
}

function onLoadRaw() {
    update('raw');
}

function onLoadBase() {
    update('base');
}

function getDataFromImage(img) {
    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    context.drawImage(img, 0, 0);
    var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    return imgData;
}

function clarifyColormap(img) {
    var data = getDataFromImage(img);

    var histogram = {};

    for (var i = 0; i < data.length; i += 4) {
        var r = data[i];
        var g = data[i + 1];
        var b = data[i + 2];
        var a = data[i + 3];
    }
}


/***************************************************************************************************/

var thresh = 128;

function palettize(img, colors) {
    return img//.convert('P', colors).convert('RGBA');
}

function applyDataToCanvas(id, data, width, height) {
    var canvas = document.getElementById(id);
    var context = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;
    var imgData = context.createImageData(width, height);
    for (var i = 0; i < data.length; i++) {
        imgData.data[i] = data[i];
    }
    context.putImageData(imgData, 0, 0);
    return canvas;
}

function crgbToHex(c, r, g, b) {
    // return JSON.stringify([c, r, g, b]);
    return ((c << 24) | (r << 16) | (g << 8) | b) >>> 0;
}

function hexToCrgb(hex) {
    // return JSON.parse(hex);
    return [
        (hex >> 24) & 0xff,
        (hex >> 16) & 0xff,
        (hex >> 8) & 0xff,
        hex & 0xff
    ];
}

var xx = {};
var cmpflag;

function cachedRandom(cmi) {
    if (!(cmi in xx)) {
        xx[cmi] = [
            Math.floor(Math.random() * 0xff),
            Math.floor(Math.random() * 0xff),
            Math.floor(Math.random() * 0xff)
        ];
    }
    return xx[cmi];
}

function extractColormap(img, fallback) { /* red channel in palettized sprite */
    if (!fallback) {
        cmpflag = requestAnimationFrame(e => extractColormap(img));
    }
    if (!img.width) {
        return;
    }
    var imgData = getDataFromImage(img);
    var colors1 = new Set();
    for (var i = 0; i < imgData.data.length; i += 4) {
        var r = imgData.data[i];
        var g = imgData.data[i + 1];
        var b = imgData.data[i + 2];
        var a = imgData.data[i + 3];
        if (a >= thresh) {
            colors1.add(crgbToHex(0, r, g, b));
        }
    }
    var colors2 = new Set();
    var colormap = {0: 0x00000000};
    while (colors1.size > 0 && Object.keys(colormap).length < 256) {
        for (var color of colors1) {
            var rgba = hexToCrgb(color);
            var c = rgba[0];
            var r = rgba[1];
            var g = rgba[2];
            var b = rgba[3];
            if (!(r in colormap)) {
                colormap[r] = crgbToHex(0, (256 + r - c) % 256, g, b);
            }
            else {
                colors2.add(crgbToHex(c + 1, (r + 1) % 256, g, b));
            }
        }
        colors1 = new Set(colors2);
        colors2.clear();
    }
    if (colors1.size > 0) {
        console.log('Color limit exceeded; number of excess colors:', colors1.size);
        if (fallback) {
            console.log('Failed');
        }
        else {
            console.log('Trying again with colormap in palette mode.');
            return extractColormap(palettize(img), true);
        }
    }
    colormapinverse = {};
    for (var r in colormap) {
        colormapinverse[colormap[r]] = parseInt(r);
    }
    // console.log(colormapinverse);
    var rdata = [];
    var now = Date.now();
    for (var i = 0; i < imgData.data.length; i += 4) {
        var r = imgData.data[i];
        var g = imgData.data[i + 1];
        var b = imgData.data[i + 2];
        var a = imgData.data[i + 3];
        var cmi = colormapinverse[crgbToHex(0, r, g, b)];
        if (a >= thresh && crgbToHex(0, r, g, b) in colormapinverse) {
            rdata.push((cachedRandom(cmi)[0] * now / 1000) & 0xff);
            rdata.push((cachedRandom(cmi)[1] * now / 1001) & 0xff);
            rdata.push((cachedRandom(cmi)[2] * now / 1002) & 0xff);
            rdata.push(255);
        }
        else {
            rdata.push(0);
            rdata.push(0);
            rdata.push(0);
            rdata.push(255);
        }
    }
    // console.log(rdata);
    var r = applyDataToCanvas("canvas-area", rdata, imgData.width, imgData.height);
    return r;
}

function pauseColormapPreview() {
    if (cmpflag) {
        cancelAnimationFrame(cmpflag);
        cmpflag = 0;
    }
    else {
        extractColormap(document.getElementById("img-area"));
    }
}

window.addEventListener("DOMContentLoaded", e => {
    document.getElementById("canvas-area").addEventListener("click", pauseColormapPreview);
    extractColormap(document.getElementById("img-area"));
});

// def lenient_image_open(name, layer, mode='RGBA'):
//     '''Returns an image by filename prefix and suffix with multiple allowed extensions.'''
//     for ext in ('png', 'jpg', 'jpeg', 'webp'):
//         fn = '{}_{}.{}'.format(name, layer, ext)
//         if os.path.isfile(fn):
//             break
//     return Image.open(fn).convert(mode)

// def resize_rgb(r, g, b, width=-1):
//     '''
//     Scale channels of palettized sprite by width and return the single merged sprite.
//     Each channel is scaled with a filter appropriate to their content.
//     Parameters:
//     - width
//       <0: crop and downscale such that diagonal is ~666 (preserve size if already <666)
//       =0: preserve size
//       >0: resize to specified width
//     '''
//     if width < 0:
//         diagonal_max = 666
//         diagonal = (r.width ** 2 + r.height ** 2) ** 0.5
//         if diagonal > diagonal_max:
//             bbox = ImageMath.lambda_eval( # don't always crop; whitespace can be important (e.g. modified official sprites)
//                 lambda _: _['convert'](_['r'] + max(0, 0xff - _['g']) + max(0, 0xff - _['b']), 'L'),
//                 r=r, g=g, b=b
//             ).getbbox()
//             r = r.crop(bbox)
//             g = g.crop(bbox)
//             b = b.crop(bbox)
//             diagonal = (r.width ** 2 + r.height ** 2) ** 0.5
//         width = min(r.width, int(r.width * diagonal_max / diagonal))
//     newsize = tuple(int(x * width / r.width) for x in r.size)

//     if width == 0 or width == r.width:
//         return Image.merge('RGB', (r, g, b))
//     else:
//         return Image.merge('RGB', (
//             r.resize(newsize, Image.NEAREST),
//             g.resize(newsize), # set resample to Image.NEAREST if area has gaps
//             b.resize(newsize)
//         ))

// def create_sprite(name, width=-1, differentiator='RGB'):
//     '''
//     Generates a palettized image from input images of the same base name.
//     The inputs can be: raw image, base colors, colormap, and linework
//                    or: shadows, highlights, colormap, and linework
//                    or: details, colormap, and linework.
//     Parameters:
//     - name
//       base name of input files
//     - width
//       <0: crop and downscale such that diagonal is ~666 (preserve size if already <666)
//       =0: preserve size
//       >0: resize to specified width
//     - differentiator
//       ='R': only consider the red channel when making the colormap
//       ='RGB': differentiate all colors when making the colormap
//     '''
//     thresh = 127

//     area = Image.open('{}_area.png'.format(name)).convert('RGBA') # colormap
//     r = get_r(area, differentiator, thresh)

//     try:
//         line = Image.open('{}_line.png'.format(name)).convert('RGBA') # linework
//     except:
//         line = Image.new('RGBA', area.size)
//         print('Warning: Linework layer not found.')
//     g = ImageMath.lambda_eval(
//         lambda _: _['convert'](0xff - _['line'], 'L'),
//         line=line.getchannel(3).convert('L')
//     )

//     try:
//         b = lenient_image_open(name, 'detail', 'L') # details
//     except:
//         try:
//             dow = lenient_image_open(name, 'shadow') # shadows
//             sha = Image.new('RGBA', dow.size, (0, 0, 0, 255))
//             shadow = Image.alpha_composite(sha, dow)
//             light = lenient_image_open(name, 'highlight') # highlights
//             high = Image.new('RGBA', light.size, (0, 0, 0, 255))
//             highlight = Image.alpha_composite(high, light) # ensure transparency is interpreted as black
//         except:
//             raw = lenient_image_open(name, 'raw') # raw image
//             base = Image.open('{}_base.png'.format(name)).convert('RGBA') # base colors
//             shadow = ImageChops.subtract(base, raw)
//             highlight = ImageChops.subtract(raw, base)
//         b = ImageMath.lambda_eval(
//             lambda _: _['convert'](0xff - (_['area'] > thresh) * (_['shadow'] * (0xff - 0x33) / 0x80) + (_['area'] > thresh) * ((_['highlight'] - 0x33) * 0x33 / 0x40), 'L'),
//             area=area.getchannel(3),
//             shadow=shadow.convert('L'),
//             highlight=highlight.convert('L')
//         )
    
//     rgb = resize_rgb(r, g, b, width)

//     path = 'sprite/{}.png'.format(name.lower())
//     os.makedirs(os.path.dirname(path), exist_ok=True)
//     rgb.save(path)
//     print('Success\n')

// def auto(directory='custom', skip=True):
//     '''Runs create_sprite with default settings for all files in the specified directory.'''
//     names = set()
//     for user in os.listdir(directory):
//         for filename in os.listdir('{}/{}'.format(directory, user)):
//             character = '_'.join(filename.split('_')[:-1])
//             name = '{}/{}/{}'.format(directory, user, character)
//             if name not in names:
//                 names.add(name)
//                 if skip and os.path.isfile('sprite/{}.png'.format(name)):
//                     print('Skipping:', name)
//                 else:
//                     try:
//                         print('Creating sprite for:', name)
//                         create_sprite(name)
//                     except Exception as e:
//                         print('Error:', e, '\n')

// if __name__ == '__main__':
//     parser = argparse.ArgumentParser()
//     parser.add_argument('-n', '--name', type=str, help='base name (processes entire `custom` folder if empty)')
//     parser.add_argument('-r', '--rerun', action='store_false', help='do not skip existing sprites (if --name is empty)')
//     parser.add_argument('-w', '--width', type=int, default=-1, help='width (px)')
//     parser.add_argument('-d', '--differentiator', type=str, default='RGB', help='differentiator (R or RGB)')
//     args = parser.parse_args()
//     if args.name:
//         create_sprite(args.name, args.width, args.differentiator)
//     else:
//         auto('custom', args.rerun)
//     update_directory()
