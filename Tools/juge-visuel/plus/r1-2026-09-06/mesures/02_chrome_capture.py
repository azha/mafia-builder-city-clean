#!/usr/bin/env python3
"""Chrome de la CAPTURE : bandeau haut (bas = liseré or), dock bas (haut = 1re ligne du dock).
Instrument : profil de luminance moyenne par ligne + profil de "chaleur" (R-B) par ligne.
Controle positif : le liseré or attendu ~y=143 px (52 CSS-HUD x 2,755) est cherche, pas suppose.
"""
import os
from PIL import Image
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(D, 'capture-1080x2400.png')
im = Image.open(p).convert('RGB'); W,H = im.size
print(f"ouvre {os.path.basename(p)} taille={im.size}")
px = im.load()

def ligne(y, x0=0, x1=None):
    x1 = x1 or W
    n = x1-x0
    r=g=b=0
    for x in range(x0,x1):
        c=px[x,y]; r+=c[0]; g+=c[1]; b+=c[2]
    return (r/n, g/n, b/n)

print("y : R G B  lum  (R-B)   [colonnes 0..1080]")
for y in list(range(100,200,2)):
    r,g,b = ligne(y)
    print(f"{y:5d} : {r:6.1f} {g:6.1f} {b:6.1f}  lum={0.2126*r+0.7152*g+0.0722*b:6.1f}  R-B={r-b:6.1f}")
