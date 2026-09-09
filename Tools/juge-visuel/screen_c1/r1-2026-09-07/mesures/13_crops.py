#!/usr/bin/env python3
"""Decoupes pour inspection visuelle. Imprime la taille de chaque source."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
O=os.path.join(D,'mesures')
C=[('capture-ecran-seul-1080x1920.png',(0,1120,1080,1330),'crop_1920_carte3_coupee.png'),
   ('capture-1080x2400.png',(0,1580,1080,1800),'crop_2400_carte5_coupee.png'),
   ('capture-1080x2400.png',(0,0,1080,290),'crop_2400_chrome_haut.png'),
   ('capture-1080x2400.png',(0,2100,1080,2400),'crop_2400_dock.png'),
   ('reference-1080x2102.png',(0,820,1080,1200),'crop_ref_hero_une.png'),
   ('reference-1080x2102.png',(0,1860,1080,2102),'crop_ref_pied_cta.png')]
for f,box,out in C:
    im=Image.open(os.path.join(D,f)); print(f"  OUVERT {f} taille={im.size} -> {out} box={box}")
    im.crop(box).save(os.path.join(O,out))
