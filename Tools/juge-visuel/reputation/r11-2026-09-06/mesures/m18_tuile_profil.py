#!/usr/bin/env python3
"""m18 - profil brut du texte d'une tuile : nb de px clairs (lum>70) par rangee."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,f,X0,Y0,a,c in [('ref','reference-1080x2102.png',21,452,548,648),
                        ('jeu','capture-1080x2400.png',18,482,517,608)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size} tuile1 local {a}..{c}')
    prof=[(y,sum(1 for x in range(600,990) if lum(px[X0+x,Y0+y])>70)) for y in range(a,c+1)]
    print('  ', ' '.join(f'{y}:{n}' for y,n in prof if n>0))
    # bandes
    rows=[y for y,n in prof if n>=3]
    b=[];d=rows[0];p=rows[0]
    for y in rows[1:]:
        if y-p>2: b.append((d,p)); d=y
        p=y
    b.append((d,p))
    print('   bandes:',b, ' padding haut', b[0][0]-a, ' interligne', (b[1][0]-b[0][0]) if len(b)>1 else '?', ' padding bas', c-b[-1][1])
