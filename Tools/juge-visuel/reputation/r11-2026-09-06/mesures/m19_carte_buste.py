#!/usr/bin/env python3
"""m19 - carte portrait et buste : bornes, axes, echelle SVG.
Jetons (r10) : visage creme2 (185,173,146) · col creme (234,224,200) ·
torse/calotte 'encre' tres sombre · rang du gant (35,42,45).
Le VISAGE est isole par proximite a creme2 (L1<=45). Le TORSE par 'plus sombre
que le fond de la carte de >4 et non creme'.
Convention de bord : NOMINALE, mi-alpha (un px appartient a la forme des que sa
couleur a franchi la moitie du chemin fond -> coeur).
Controle positif : la largeur de la carte doit valoir ~423 px (r10 C4).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD=(176,141,62); CREME2=(185,173,146); CREME=(234,224,200)
def prox(p,c,t): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])<=t
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'ref':('reference-1080x2102.png',21,452),'jeu':('capture-1080x2400.png',18,482)}
for nom in ('ref','jeu'):
    f,X0,Y0=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}  origine cadre ({X0},{Y0})')
    # carte : filet or, colonnes ou >=300 px or dans la zone locale y 420..1085
    cols=[x for x in range(30,520)
          if sum(1 for y in range(420,1085) if prox(px[X0+x,Y0+y],GOLD,120) and px[X0+x,Y0+y][0]>px[X0+x,Y0+y][1]>px[X0+x,Y0+y][2])>=300]
    rows=[y for y in range(410,1100)
          if sum(1 for x in range(30,520) if prox(px[X0+x,Y0+y],GOLD,120) and px[X0+x,Y0+y][0]>px[X0+x,Y0+y][1]>px[X0+x,Y0+y][2])>=200]
    print(f'  carte : colonnes or {cols[0]}..{cols[-1]} (l={cols[-1]-cols[0]+1}) '
          f'· rangees or {rows[0]}..{rows[-1]} (h={rows[-1]-rows[0]+1}) · centre x = {(cols[0]+cols[-1])/2:.1f}')
    # visage
    vis=[(x,y) for y in range(430,1085) for x in range(40,510) if prox(px[X0+x,Y0+y],CREME2,45)]
    xs=[p[0] for p in vis]; ys=[p[1] for p in vis]
    print(f'  visage(creme2) : n={len(vis)} bbox x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1}) '
          f'y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1}) · centre x = {(min(xs)+max(xs))/2:.1f}')
    # col (creme clair) = triangle
    col=[(x,y) for y in range(430,1085) for x in range(40,510) if prox(px[X0+x,Y0+y],CREME,45)]
    if col:
        cx=[p[0] for p in col]; cy=[p[1] for p in col]
        print(f'  col(creme)     : n={len(col)} bbox x {min(cx)}..{max(cx)} (l={max(cx)-min(cx)+1}) '
              f'y {min(cy)}..{max(cy)} (h={max(cy)-min(cy)+1}) · centre x = {(min(cx)+max(cx))/2:.1f} '
              f'· remplissage aire/boite = {len(col)/((max(cx)-min(cx)+1)*(max(cy)-min(cy)+1)):.3f}')
