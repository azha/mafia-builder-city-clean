#!/usr/bin/env python3
"""m09 - profil COLONNE de l'encre du titre : ou le titre disparait-il ?
Pour chaque tranche de 25 px en x, compte l'encre doree (r>g>b, lum>90) dans la
bande du titre, au 2400 (y544..593) et au 1920 (y64..113).
Controle positif : les tranches hors medaillon (x<430) doivent survivre.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def prof(f,y0,y1):
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    out={}
    for x0 in range(325,760,25):
        n=sum(1 for y in range(y0,y1) for x in range(x0,min(x0+25,760))
              if px[x,y][0]>px[x,y][1]>px[x,y][2] and lum(px[x,y])>90)
        out[x0]=n
    return out
a=prof('capture-1080x2400.png',544,594)
b=prof('capture-1080x1920.png',64,114)
print(' x0   2400  1920   survie')
for x0 in a:
    s = f'{100*b[x0]/a[x0]:5.0f} %' if a[x0] else '   n/a'
    print(f'{x0:4d} {a[x0]:5d} {b[x0]:5d} {s}')
