# Grandeur : centre + diametre exterieur de l'anneau du medaillon, + epaisseur de l'anneau.
# Methode : sur la ligne horizontale du centre presume, chercher les 2 pics de la famille "or/orange"
#           (satur > .35 et L > 90) les plus ecartes ; puis affiner par balayage vertical.
# Convention de bord : NOMINALE (>= mi-amplitude) ET COEUR (>= 90% amplitude) — les deux donnees.
from common import *
def satur(c):
    mx=max(c); return 0 if mx==0 else (mx-min(c))/mx
def orish(c):
    return satur(c)>0.35 and lum(c)>85 and c[0]>c[1]>c[2]
def runs(im,y,x0,x1):
    px=im.load(); out=[]; cur=None
    for x in range(x0,x1):
        if orish(px[x,y]):
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    return out
def scan(im,label,ycand,x0,x1,scale):
    print(f'  {label}')
    best=None
    for y in ycand:
        rr=[r for r in runs(im,y,x0,x1) if r[1]-r[0]>=1]
        if len(rr)>=2:
            w=rr[-1][1]-rr[0][0]
            if best is None or w>best[0]: best=(w,y,rr)
    if not best: print('    rien'); return None
    w,y,rr=best
    print(f'    ligne la plus large : y={y} ({y/scale:.2f} CSS)  segments={rr}')
    d=(rr[-1][1]-rr[0][0]+1)
    cx=(rr[-1][1]+rr[0][0])/2.0
    print(f'    diametre EXT = {d} px = {d/scale:.2f} CSS ; centre x = {cx:.1f} px = {cx/scale:.2f} CSS')
    print(f'    anneau gauche {rr[0][1]-rr[0][0]+1} px = {(rr[0][1]-rr[0][0]+1)/scale:.2f} CSS ; droite {rr[-1][1]-rr[-1][0]+1} px = {(rr[-1][1]-rr[-1][0]+1)/scale:.2f} CSS')
    return cx,y,d
r=op(REF);  scan(r,'REF medaillon',range(90,150),450,750,REF_S)
c=op(C19);  scan(c,'CAP1920 medaillon',range(80,150),400,700,CAP_S)
c2=op(C24); scan(c2,'CAP2400 district medaillon',range(80,150),400,700,CAP_S)
t=op(T24);  scan(t,'TEMOIN famille medaillon',range(80,150),400,700,CAP_S)
