#!/usr/bin/env python3
"""m31 - torse (epaules) et gant. Torse = silhouette non-fond sous le menton,
hors col creme. Gant = ellipse 'rang' (35,42,45) en bas a gauche du torse.
Controle positif : le torse doit etre centre sur x=272 des deux cotes."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RANG=(35,42,45)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
for nom,f,X0,Y0,S,FOND in [('ref','reference-1080x2102.png',21,452,5.486,(17,24,35)),
                           ('jeu','capture-1080x2400.png',18,482,5.472,(13,22,34))]:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size}')
    rows={}
    for y in range(830,1085):
        xs=[x for x in range(62,484) if L1(px[X0+x,Y0+y],FOND)>18]
        if xs and len(xs)>20: rows[y]=(min(xs),max(xs),max(xs)-min(xs)+1)
    ys=sorted(rows)
    print(f'  torse : rangees {ys[0]}..{ys[-1]}')
    for y in ys[::12]:
        a,b,w=rows[y]
        print(f'    y={y:4d} x {a}..{b} l={w} ({w/S:.2f} u) centre {(a+b)/2:.1f}')
    wmax=max(rows[y][2] for y in rows); ymax=max(rows,key=lambda y:rows[y][2])
    print(f'  largeur MAX du torse {wmax} px ({wmax/S:.2f} u) a y={ymax}, centre {(rows[ymax][0]+rows[ymax][1])/2:.1f}')
    # gant : pixels 'rang' groupes
    pts={(x,y) for y in range(920,1060) for x in range(80,300) if L1(px[X0+x,Y0+y],RANG)<=25}
    vus=set(); best=[]
    for p in pts:
        if p in vus: continue
        pile=[p]; vus.add(p); cur=[]
        while pile:
            q=pile.pop(); cur.append(q)
            for dx in(-2,-1,0,1,2):
                for dy in(-2,-1,0,1,2):
                    r=(q[0]+dx,q[1]+dy)
                    if r in pts and r not in vus: vus.add(r); pile.append(r)
        if len(cur)>len(best): best=cur
    if best:
        xs=[q[0] for q in best]; ys2=[q[1] for q in best]
        print(f'  gant : n={len(best)} x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1} = {(max(xs)-min(xs)+1)/S:.2f} u) '
              f'y {min(ys2)}..{max(ys2)} (h={max(ys2)-min(ys2)+1} = {(max(ys2)-min(ys2)+1)/S:.2f} u) '
              f'centre ({(min(xs)+max(xs))/2:.1f},{(min(ys2)+max(ys2))/2:.1f})')
        # deborde-t-il du torse ?
        dehors=sum(1 for x,y in best if y not in rows or not (rows[y][0]<=x<=rows[y][1]))
        print(f'    px hors du torse : {dehors}')
