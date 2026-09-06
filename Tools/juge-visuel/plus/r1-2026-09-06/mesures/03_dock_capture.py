#!/usr/bin/env python3
"""Dock bas de la CAPTURE : premiere ligne du dock (bord haut) mesuree, jamais deduite.
Le dock se reconnait a ses 4 pastilles rondes bleu nuit sur fond sombre + libelles.
Instrument : profil de luminance par ligne sur la moitie basse + detection du bord des pastilles.
Controle positif : la largeur totale reste 1080 sur toutes les lignes lues."""
import os
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(D,'capture-1080x2400.png')
im = Image.open(p).convert('RGB'); W,H = im.size
print(f"ouvre {os.path.basename(p)} taille={im.size}  (controle positif largeur={W})")
px = im.load()
def stats(y):
    r=g=b=0; mx=0
    for x in range(W):
        c=px[x,y]; r+=c[0]; g+=c[1]; b+=c[2]
        l=0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
        if l>mx: mx=l
    return r/W,g/W,b/W,mx
print("y :  R      G      B     lum_moy  lum_max")
for y in range(2020, 2400, 5):
    r,g,b,mx = stats(y)
    print(f"{y:5d} : {r:6.1f} {g:6.1f} {b:6.1f}  {0.2126*r+0.7152*g+0.0722*b:6.1f}  {mx:6.1f}")
