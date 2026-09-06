#!/usr/bin/env python3
"""m13b - PASTILLES : 1er jet fausse par (a) la carte INCLINEE (les 2 colonnes ne sont pas a la
meme y) et (b) la pastille VIDE de la reference qui est un ANNEAU dont l'interieur = fond creme
(donc invisible a un detecteur 'differe du fond'). Corrige : composantes connexes sur l'encre.
Controle positif : on doit retrouver 3 pastilles par rangee des deux cotes (le canon en dessine 3).
"""
from PIL import Image
import os, statistics
from collections import deque
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def comps(im,pred,x0,x1,y0,y1,minaire=80):
    px=im.load(); vus=set(); out=[]
    for Y in range(y0,y1):
        for X in range(x0,x1):
            if (X,Y) in vus or not pred(px[X,Y]): continue
            q=deque([(X,Y)]); vus.add((X,Y)); pts=[]
            while q:
                cx,cy=q.popleft(); pts.append((cx,cy))
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                    nx,ny=cx+dx,cy+dy
                    if x0<=nx<x1 and y0<=ny<y1 and (nx,ny) not in vus and pred(px[nx,ny]):
                        vus.add((nx,ny)); q.append((nx,ny))
            if len(pts)>=minaire:
                xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                out.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    out.sort(key=lambda c:c[0]); return out

def rouge(p): r,g,b=p; return r>100 and r>1.8*g and r>1.8*b
def nonfond_cap(p): return max(abs(p[0]-13),abs(p[1]-13),abs(p[2]-13))>20

print("\n-- REFERENCE : pastilles = composantes ROUGE SOMBRE (rempli ET anneau) --")
for lab,(x0,x1,y0,y1) in (('PORTEE',(130,270,1400,1460)),('URGENCE',(550,700,1385,1445))):
    cs=comps(ref,rouge,x0,x1,y0,y1,minaire=60)
    print(f"  [{lab}] {len(cs)} pastille(s) :")
    px=ref.load()
    for i,c in enumerate(cs):
        Lw,Hh=c[2]-c[0]+1,c[3]-c[1]+1
        cx,cy=(c[0]+c[2])//2,(c[1]+c[3])//2
        centre=px[cx,cy]
        rempl=c[4]/(Lw*Hh)
        print(f"    #{i+1} x={c[0]}..{c[2]} y={c[1]}..{c[3]} D={Lw}x{Hh} aire={c[4]} remplissage={rempl:.3f}"
              f" centre={centre} -> {'PLEIN' if rempl>0.60 else 'ANNEAU CREUX'}")

print("\n-- CAPTURE : pastilles = composantes non-fond --")
for lab,(x0,x1,y0,y1) in (('PORTEE',(180,300,1565,1605)),('URGENCE',(205,325,1610,1650))):
    cs=comps(cap,nonfond_cap,x0,x1,y0,y1,minaire=60)
    print(f"  [{lab}] {len(cs)} pastille(s) :")
    px=cap.load()
    for i,c in enumerate(cs):
        Lw,Hh=c[2]-c[0]+1,c[3]-c[1]+1
        cx,cy=(c[0]+c[2])//2,(c[1]+c[3])//2
        rempl=c[4]/(Lw*Hh)
        print(f"    #{i+1} x={c[0]}..{c[2]} y={c[1]}..{c[3]} D={Lw}x{Hh} aire={c[4]} remplissage={rempl:.3f}"
              f" centre={px[cx,cy]} -> {'PLEIN' if rempl>0.60 else 'ANNEAU CREUX'}")
