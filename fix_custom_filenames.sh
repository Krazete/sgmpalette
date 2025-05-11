#!/bin/bash
IFS=$'\n'; set -f
for i in $(find custom -name *.png); do
    while [[ $i =~ (.*)а(.*) ]]; do
        j=${BASH_REMATCH[1]}a${BASH_REMATCH[2]}
        mv "$i" "$j"
        i=$j
        echo "Cyrillic а replaced in $i"
        sleep .1
    done
    while [[ $i =~ (.*)е(.*) ]]; do
        j=${BASH_REMATCH[1]}e${BASH_REMATCH[2]}
        mv "$i" "$j"
        i=$j
        echo "Cyrillic е replaced in $i"
        sleep .1
    done
    if [[ $i =~ (.+_(raw|line|base|area|highlight|shadow)).+\.png ]]; then
        j=${BASH_REMATCH[1]}
        while [[ -f "$j.png" ]]; do
            j=$j+
        done
        mv "$i" "$j.png"
        echo "$i -> $j.png"
    fi
done
unset IFS; set +f
read -p "All filesnames fixed. Press any key to continue." -r -n 1 -s
