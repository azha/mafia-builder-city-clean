#!/usr/bin/env python3
"""m28 - bornes horizontales des tuiles (F8) : liste COMPLETE des colonnes de
liseré dans les rangees de la tuile 1, cote a cote. Convention NOMINALE.
Controle positif : la colonne du bord droit du .elast (ref 1006..1008) doit
apparaitre dans les deux listes."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,f,X0,Y0,a,c in [('ref','reference-1080x2102.png',21,452,548,648),
                        ('jeu','capture-1080x2400.png',18,482,517,608)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    cols=[x for x in range(430,1044)
          if sum(1 for y in range(a+4,c-3) if lum(px[X0+x,Y0+y])-max(lum(px[X0+x-5,Y0+y]),lum(px[X0+min(1043,x+5),Y0+y]))>3)>=(c-a-8)*0.7]
    b=[];  d=cols[0] if cols else None; p=d
    for x in cols[1:]:
        if x-p>2: b.append((d,p)); d=x
        p=x
    if cols: b.append((d,p))
    print(f'{nom} {f} {im.size} : liserés verticaux dans la tuile1 -> {b}')
