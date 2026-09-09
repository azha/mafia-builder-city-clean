#!/usr/bin/env python3
"""m30 - yeux et bouche : formes sombres ENTOUREES de visage (creme2).
Un px est 'trait du visage' s'il est sombre (lum<90) ET si, sur sa rangee, il est
encadre a gauche ET a droite par du creme2 a moins de 60 px.
Controle positif : deux groupes d'yeux + un groupe de bouche attendus.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREME2=(185,173,146)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,f,X0,Y0,S in [('ref','reference-1080x2102.png',21,452,5.486),
                      ('jeu','capture-1080x2400.png',18,482,5.472)]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    pts=set()
    for y in range(640,790):
        for x in range(190,360):
            if lum(px[X0+x,Y0+y])>=90: continue
            g=any(L1(px[X0+xx,Y0+y],CREME2)<=45 for xx in range(max(190,x-60),x))
            d=any(L1(px[X0+xx,Y0+y],CREME2)<=45 for xx in range(x+1,min(360,x+61)))
            if g and d: pts.add((x,y))
    # groupes connexes
    vus=set(); grp=[]
    for p in pts:
        if p in vus: continue
        pile=[p]; vus.add(p); cur=[]
        while pile:
            q=pile.pop(); cur.append(q)
            for dx in(-2,-1,0,1,2):
                for dy in(-2,-1,0,1,2):
                    r=(q[0]+dx,q[1]+dy)
                    if r in pts and r not in vus: vus.add(r); pile.append(r)
        if len(cur)>=25: grp.append(cur)
    grp.sort(key=lambda g:(min(q[1] for q in g), min(q[0] for q in g)))
    for g in grp:
        xs=[q[0] for q in g]; ys=[q[1] for q in g]
        print(f'  groupe n={len(g)} x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1} = {(max(xs)-min(xs)+1)/S:.2f} u) '
              f'y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1} = {(max(ys)-min(ys)+1)/S:.2f} u) '
              f'centre ({(min(xs)+max(xs))/2:.1f},{(min(ys)+max(ys))/2:.1f})')
