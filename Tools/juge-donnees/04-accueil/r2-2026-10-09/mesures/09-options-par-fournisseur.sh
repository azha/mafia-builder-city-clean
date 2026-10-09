#!/bin/sh
# Compte les options de CHAQUE fournisseur HL, a la source.
cd /home/erutheone/project/mafia-clean-city/services/game-back/src/progression/loop10/providers
python3 -I -c "
import re,glob
tot=0
for f in sorted(glob.glob('*.ts')):
    src=open(f).read()
    for m in re.finditer(r'options:\s*\[(.*?)\]', src, re.S):
        body=m.group(1)
        labels=re.findall(r'label:\s*[\x27\"\`]([^\x27\"\`]*)', body)
        line=src[:m.start()].count(chr(10))+1
        print(f'{f}:{line}  n_options={len(labels)}  {labels}')
        tot+=len(labels)
print()
print('fournisseurs =', len(glob.glob('*.ts')))
print('total libelles =', tot)
"
