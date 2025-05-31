import os
import json
import re

blacklist = [
    'cat', # easter egg; randomly added by index.js instead
    'Beowulf_AA2_GiganticArm', # duplicate of Beowulf_BB1_T1_GiganticArm
    'Eliza_Debonaire', # duplicate of Eliza_NobleMogul with swapped line & detail channels
    'Marie_BB1_GiganBeam', # duplicate of BlackDahlia_BB1_DoorMat
    'Marie_BB3_FistFromAbove', # duplicate of BlackDahlia_BB3_Empower
    'custom/demiiial/marie', # color map too messy; index overlap with face and hair
    'custom/krazete/n_ko_avatar_filia', # cropped; replaced with full version by n_ko
]

def update_directory():
    '''Updates directory.js with contents of sprite folder.'''
    directory = {}

    for root, dirs, files in os.walk('sprite'):
        root = re.sub(r'\\', '/', root)
        for file in files:
            filepath = '/'.join(filter(None, [
                re.sub(r'^sprite/?', '', root),
                '.'.join(file.split('.')[0:-1])
            ]))
            if filepath in blacklist:
                continue
            if root == 'sprite':
                character = filepath.split('_')[0].lower()
                if character == 'heavymetal':
                    character = 'bigband'
            elif '/' in root:
                character = root.split('/')[1]
            directory.setdefault(character, [])
            directory[character].append(filepath)

    with open('directory.js', 'w') as fp:
        fp.write('var ids = ')
        json.dump(directory, fp, indent=4)
        fp.write(';\n')

if __name__ == '__main__':
    update_directory()
