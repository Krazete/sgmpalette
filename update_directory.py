import os
import json

def update_directory():
    '''Updates directory.js with contents of sprite folder.'''
    directory = {}

    for path in os.listdir('sprite'):
        if os.path.isdir(path) or path == 'cat.png':
            continue
        filename = path.split('.')[0]
        character = filename.split('_')[0].lower()
        if character == 'heavymetal':
            character = 'bigband'
        directory.setdefault(character, [])
        directory[character].append(filename)

    directory.setdefault('custom', [])
    for path in os.listdir('sprite/custom'):
        for subpath in os.listdir('sprite/custom/{}'.format(path)):
            name = '{}/{}'.format(path, subpath.split('.')[0])
            directory['custom'].append('custom/{}'.format(name))

    with open('directory.js', 'w') as fp:
        fp.write('var ids = ')
        json.dump(directory, fp, indent=4)
        fp.write(';\n')

if __name__ == '__main__':
    update_directory()
