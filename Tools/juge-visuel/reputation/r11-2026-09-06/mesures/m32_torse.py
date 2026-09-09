#!/usr/bin/env python3
"""m32 - torse : sommet des epaules et largeur a 3 hauteurs (x borne a 70..475
pour exclure le filet or de la carte)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
for nom,f,X0,Y0,S,FOND in [('ref','reference-1080x2102.png',21,452,5.486,(17,24,35)),
                           ('jeu','capture-1080x2400.png',18,482,5.472,(13,22,34))]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    rows={}
    for y in range(820,1080):
        xs=[x for x in range(70,476) if L1(px[X0+x,Y0+y],FOND)>18]
        if len(xs)>30: rows[y]=(min(xs),max(xs),max(xs)-min(xs)+1)
    ys=sorted(rows)
    print(f'  premiere rangee de torse (hors tete/cou) : y={ys[0]}')
    for y in (ys[0],ys[0]+10,ys[0]+30,ys[0]+60,ys[0]+100,ys[-1]):
        if y in rows:
            a,b,w=rows[y]
            print(f'    y={y:4d} x {a}..{b} l={w} ({w/S:.2f} u) centre {(a+b)/2:.1f}')
    wmax=max(rows[y][2] for y in rows); ymax=max(rows,key=lambda y:rows[y][2])
    print(f'  largeur max {wmax} px ({wmax/S:.2f} u) a y={ymax} · bas du torse y={ys[-1]}')
