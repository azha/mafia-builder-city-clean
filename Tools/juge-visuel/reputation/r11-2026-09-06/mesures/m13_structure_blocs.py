#!/usr/bin/env python3
"""m13 - structure verticale : toutes les LIGNES horizontales fines (liseré de
panneau, filet or) a l'interieur du cadre, en coordonnees LOCALES du cadre.
Detecteur : rangee y ou >=250 px de x satisfont lum(y) - max(lum(y-3),lum(y+3)) > 4
(un trait clair sur fond sombre), ou l'inverse (trait sombre).
Convention de bord : NOMINALE (mi-alpha) — la ligne est comptee des que le pixel
a franchi la moitie du chemin fond -> coeur ; les epaisseurs rapportees sont
donc des epaisseurs a mi-alpha.
Controle positif : le filet or sous l'enseigne (7 px) doit ressortir des 2 cotes.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'reference-1080x2102.png':(21,452,1058,2078),
     'capture-1080x2400.png':(18,482,1061,2109)}
for f,(x0,y0,x1,y1) in CAD.items():
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {f} taille={im.size} cadre x{x0}..{x1} y{y0}..{y1} (l={x1-x0+1} h={y1-y0+1})')
    rows=[]
    for y in range(y0+4,y1-3):
        n=0
        for x in range(x0+8,x1-7,2):
            l=lum(px[x,y]); a=lum(px[x,y-3]); b=lum(px[x,y+3])
            if l-max(a,b)>4: n+=1
        if n>=125: rows.append(y)
    bandes=[]
    if rows:
        deb=rows[0]; prev=rows[0]
        for y in rows[1:]:
            if y-prev>2: bandes.append((deb,prev)); deb=y
            prev=y
        bandes.append((deb,prev))
    print('  traits clairs (y absolu -> y local, epaisseur) :')
    for d,fn in bandes:
        print(f'    {d}..{fn}  ->  local {d-y0}..{fn-y0}  ep {fn-d+1}')
