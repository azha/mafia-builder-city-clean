#!/usr/bin/env python3
"""m11 - le MEDAILLON d'or ('1 / LIBRE') et le SCEAU DE CIRE rouge de la carte.
Fenetres LARGES + composantes connexes, pour ne pas tronquer le blob (1er jet tronque : corrige).
Controle positif : le medaillon existe dans les DEUX -> ancre d'echelle partagee.
Controle negatif : le detecteur 'cire rouge' rend >>0 dans la REF et se cherche partout dans la CAP.
"""
from PIL import Image
import os, statistics, math
from collections import deque
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def med_or(p):
    r,g,b=p; return r>150 and g>110 and b<150 and r>1.4*b and g>0.55*r
def cire(p):
    r,g,b=p; return r>100 and r>2.0*g and r>2.0*b

def composantes(im,pred,x0,x1,y0,y1,minaire=400):
    px=im.load(); vus=set(); out=[]
    for Y in range(y0,y1):
        for X in range(x0,x1):
            if (X,Y) in vus or not pred(px[X,Y]): continue
            q=deque([(X,Y)]); vus.add((X,Y)); pts=[]
            while q:
                cx,cy=q.popleft(); pts.append((cx,cy))
                for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx,ny=cx+dx,cy+dy
                    if x0<=nx<x1 and y0<=ny<y1 and (nx,ny) not in vus and pred(px[nx,ny]):
                        vus.add((nx,ny)); q.append((nx,ny))
            if len(pts)>=minaire:
                xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
                out.append((min(xs),min(ys),max(xs),max(ys),len(pts)))
    out.sort(key=lambda c:-c[4]); return out

print("\n-- MEDAILLON (jeton de budget) : plus grosse composante 'or' hors carte --")
for im,label,win in ((ref,'REF',(740,1080,1100,1420)),(cap,'CAP',(650,1080,1200,1500))):
    cs=composantes(im,med_or,*win,minaire=2000)
    if not cs: print(f"[{label}] AUCUNE composante"); continue
    c=cs[0]; Lw,Hh=c[2]-c[0]+1,c[3]-c[1]+1
    print(f"[{label}] bbox x={c[0]}..{c[2]} y={c[1]}..{c[3]}  L={Lw} H={Hh} aire={c[4]}  "
          f"remplissage={c[4]/(Lw*Hh):.3f} (disque plein=0.785)")
    globals()['m_'+label]=(c,Lw,Hh)
cR,LR,HR = m_REF; cC,LC,HC = m_CAP
print(f"  -> ANCRE D'ECHELLE partagee : diametre REF {LR}x{HR} | CAP {LC}x{HC} | rapport L={LC/LR:.3f} H={HC/HR:.3f}")

def radial(im,c,frac,label):
    px=im.load(); cx=(c[0]+c[2])//2; cy=(c[1]+c[3])//2; r=int((c[2]-c[0]+1)*frac)
    vals=[]
    for k in range(720):
        a=k*math.pi/360.0
        x=int(cx+r*math.cos(a)); y=int(cy+r*math.sin(a))
        if 0<=x<im.size[0] and 0<=y<im.size[1]: vals.append(L(px[x,y]))
    print(f"  {label} profil circulaire (r={r}, {frac:.2f}xL) : min={min(vals):.0f} max={max(vals):.0f} "
          f"moy={statistics.mean(vals):.1f} ecart-type={statistics.pstdev(vals):.2f}")
radial(ref,cR,0.47,'[REF]'); radial(cap,cC,0.47,'[CAP]')

print("\n-- SCEAU DE CIRE rouge --")
cs=composantes(ref,cire,400,900,600,900,minaire=1000)
if cs:
    c=cs[0]; print(f"[REF] CONTROLE POSITIF bbox x={c[0]}..{c[2]} y={c[1]}..{c[3]} L={c[2]-c[0]+1} H={c[3]-c[1]+1} aire={c[4]} -> OK")
else: print("[REF] AUCUN -> ECHEC du controle positif")
cs2=composantes(cap,cire,0,1080,1200,1750,minaire=200)
print(f"[CAP] recherche sur TOUTE la zone carte (x0-1080 y1200-1750) : "
      + (f"{len(cs2)} composante(s), plus grosse aire={cs2[0][4]} bbox={cs2[0][:4]}" if cs2 else "AUCUNE composante de cire rouge"))
