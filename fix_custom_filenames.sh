#!/bin/bash
IFS=$'\n'; set -f
for i in $(find custom -name *.png); do
    while [[ $i =~ (.*)а(.*) ]]; do
        j=${BASH_REMATCH[1]}a${BASH_REMATCH[2]}
        mv "$i" "$j.png"
        i=$j
        echo "Cyrillic a replaced in $i"
    done
    if [[ $i =~ (.+_(raw|line|base|area|highlight|shadow)).+\.png ]]; then
        j=${BASH_REMATCH[1]}
        mv "$i" "$j.png"
        echo "$i -> $j.png"
    fi
done
unset IFS; set +f
read -p "Press any key to exit." -r -n 1 -s
