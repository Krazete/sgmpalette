import argparse
from PIL import Image

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('-n', '--name', type=str, help='character symbol name')
    args = parser.parse_args()

    fn = 'character_symbol_{}01.png'.format(args.name)
    img = Image.open(fn).convert('RGBA')
    alpha = img.getchannel(3)
    white = Image.new('LA', img.size, 255)
    white.putalpha(alpha)
    white.save(fn)
