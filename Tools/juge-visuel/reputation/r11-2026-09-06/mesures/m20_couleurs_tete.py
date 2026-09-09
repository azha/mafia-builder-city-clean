#!/usr/bin/env python3
"""m20 - releve de couleurs dans la region de la tete (coordonnees LOCALES cadre)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
for nom in ('ref','jeu'):
    f,X0,Y0=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    for y in range(590,700,10):
        print(f'  y={y:4d} : ' + ' '.join(f'{x}:{px[X0+x,Y0+y]}' for x in range(190,360,20)))
    print('  --- fond de carte (x=100) :', [px[X0+100,Y0+y] for y in (500,600,700,800)])
