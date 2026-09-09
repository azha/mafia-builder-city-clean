#!/usr/bin/env python3
"""m38 - CTA (F7) et enseigne (F13) : bornes, epaisseur de bordure, texte.
Convention NOMINALE mi-alpha pour les bordures."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def dore(p): return p[0]>p[1]>p[2] and p[0]>80
for nom,f,X0,Y0,cta,ens in [('ref','reference-1080x2102.png',21,452,(1495,1600),(25,222)),
                            ('jeu','capture-1080x2400.png',18,482,(1502,1600),(25,216))]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    a,b=cta
    rows=[y for y in range(a,b) if sum(1 for x in range(60,980,2) if dore(px[X0+x,Y0+y]))>300]
    cols=[x for x in range(0,1044) if sum(1 for y in range(a+8,b-8) if dore(px[X0+x,Y0+y]))>60]
    bb=[];d=cols[0];p=cols[0]
    for x in cols[1:]:
        if x-p>2: bb.append((d,p)); d=x
        p=x
    bb.append((d,p))
    print(f'  CTA : rangees pleines de bord {rows} · colonnes de bord {bb}')
    if len(rows)>=2:
        print(f'    hauteur bord a bord {rows[-1]-rows[0]+1} · epaisseur haut '
              f'{sum(1 for y in rows if y<rows[0]+8)}')
    # texte du CTA
    tr=[y for y in range(a+8,b-8) if sum(1 for x in range(150,950) if dore(px[X0+x,Y0+y]) and lum(px[X0+x,Y0+y])>110)>=5]
    if tr: print(f'    texte : y {tr[0]}..{tr[-1]} (h={tr[-1]-tr[0]+1})')
    # enseigne : liseré du bloc
    a2,b2=ens
    cols2=[x for x in range(0,1044) if sum(1 for y in range(a2+6,b2-30) if lum(px[X0+x,Y0+y])-max(lum(px[X0+max(0,x-4),Y0+y]),lum(px[X0+min(1043,x+4),Y0+y]))>3)>=100]
    print(f'  enseigne : colonnes de liseré {cols2}')
