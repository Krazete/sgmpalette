#!/bin/bash
source fix_custom_filenames.sh
echo
python -um create_sprite
read -p "Press any key to exit." -r -n 1 -s
