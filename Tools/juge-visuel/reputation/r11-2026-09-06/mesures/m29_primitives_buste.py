#!/usr/bin/env python3
"""m29 - primitives du buste : cou, col (triangle creme), bouche, yeux, gant,
torse. Coordonnees LOCALES du cadre ; conversion en unites SVG avec l'echelle
mesuree (r10 C18 : 5,486 px/u ref · 5,472 px/u jeu).
Convention de bord : NOMINALE mi-alpha (jeton a +-45 en L1).
Controle positif : les yeux doivent tomber a x ~26,5 / 35,5 u des deux cotes.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREME2=(185,173,146); CREME=(234,224,200); RANG=(35,42,45)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
CAD={'ref':('reference-1080x2102.png',21,452,5.486,(17,24,35)),
     'jeu':('capture-1080x2400.png',18,482,5.472,(13,22,34))}
for nom in ('ref','jeu'):
    f,X0,Y0,S,FOND=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}  echelle {S} px/u')
    def bbox(pred, ya,yb, xa=60,xb=490):
        pts=[(x,y) for y in range(ya,yb) for x in range(xa,xb) if pred(px[X0+x,Y0+y])]
        if not pts: return None
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        return (min(xs),max(xs),min(ys),max(ys),len(pts))
    # COU : bande creme2 entre le menton et le col
    for lab,pred,ya,yb in [('col (creme)',lambda p:L1(p,CREME)<=45,780,960),
                           ('gant (rang)',lambda p:L1(p,RANG)<=22,930,1070)]:
        b=bbox(pred,ya,yb)
        if b:
            x0,x1,y0,y1,n=b
            print(f'  {lab:14s} x {x0}..{x1} (l={x1-x0+1} = {(x1-x0+1)/S:.2f} u) '
                  f'y {y0}..{y1} (h={y1-y0+1} = {(y1-y0+1)/S:.2f} u) centre x {(x0+x1)/2:.1f} '
                  f'n={n} remplissage {n/((x1-x0+1)*(y1-y0+1)):.3f}')
    # cou : largeur de la bande creme2 juste sous le menton
    for y in range(760,850,8):
        xs=[x for x in range(150,400) if L1(px[X0+x,Y0+y],CREME2)<=45]
        if xs: print(f'   cou/menton y={y} : x {min(xs)}..{max(xs)} l={max(xs)-min(xs)+1} = {(max(xs)-min(xs)+1)/S:.2f} u')
    # bouche : trait sombre DANS le visage, sous les yeux
    pts=[(x,y) for y in range(700,780) for x in range(200,350)
         if L1(px[X0+x,Y0+y],CREME2)>110 and px[X0+x,Y0+y][0]<120]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        # separe yeux (haut) et bouche (bas) par un trou en y
        yy=sorted(set(ys)); grp=[]; d=yy[0]; p=yy[0]
        for v in yy[1:]:
            if v-p>3: grp.append((d,p)); d=v
            p=v
        grp.append((d,p))
        for g in grp:
            sub=[q for q in pts if g[0]<=q[1]<=g[1]]
            sx=[q[0] for q in sub]
            print(f'   trait sombre y {g[0]}..{g[1]} : x {min(sx)}..{max(sx)} l={max(sx)-min(sx)+1} '
                  f'= {(max(sx)-min(sx)+1)/S:.2f} u · h={g[1]-g[0]+1} = {(g[1]-g[0]+1)/S:.2f} u · n={len(sub)}')
