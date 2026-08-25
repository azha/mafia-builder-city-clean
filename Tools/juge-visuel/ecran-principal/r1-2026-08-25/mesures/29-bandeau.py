# -*- coding: utf-8 -*-
"""Bandeau haut: rectangle, coins, volutes, losange ; bandeau-alerte ; libelle Verge-A."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
EK=3.0; EC=1080/392.0
def prof(im,y,x0,x1,tag,seuil=6):
    px=im.load(); prev=None; out=[]
    for x in range(x0,x1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>seuil: out.append((x,round(prev),round(L)))
        prev=L
    print(f"  [{tag}] y={y}: "+" | ".join(f"{x}:{a}->{b}" for x,a,b in out))
print("### bords lateraux du bandeau haut ###")
prof(C,60,0,120,'c19 gauche y=60'); prof(C,60,960,1080,'c19 droite y=60')
prof(C,4,0,140,'c19 gauche y=4');   prof(C,4,940,1080,'c19 droite y=4')
prof(K,60,0,120,'canon gauche y=60'); prof(K,60,1056,1176,'canon droite y=60')
print("\n### hauteur du bandeau: profil vertical hors medaillon ###")
def vprof(im,x,y0,y1,tag,seuil=6):
    px=im.load(); prev=None; out=[]
    for y in range(y0,y1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>seuil: out.append((y,round(prev),round(L)))
        prev=L
    print(f"  [{tag}] x={x}: "+" | ".join(f"{y}:{a}->{b}" for y,a,b in out))
vprof(C,800,0,250,'c19 x=800'); vprof(K,800,0,250,'canon x=800')
print("\n### VOLUTES (canon: opacite .28, x 12..114 et 1062..1164, y 60..96) ###")
def M(im,x0,y0,x1,y1,t):
    c=med(im,x0,y0,x1,y1); print(f"    {t:46s} {c} L={lum(c):6.1f}"); return c
def maxi(im,x0,y0,x1,y1,t):
    px=im.load(); b=max(((lum(px[x,y]),px[x,y],x,y) for y in range(y0,y1) for x in range(x0,x1)))
    print(f"    {t:46s} max L={b[0]:.1f} {b[1]} a ({b[2]},{b[3]})"); return b
maxi(K,10,58,116,100,'canon volute gauche')
maxi(K,1060,58,1166,100,'canon volute droite')
maxi(C,10,55,105,100,'c19 zone volute gauche (hors fleche)')
maxi(C,1000,55,1076,100,'c19 zone volute droite')
print("\n### LOSANGE sous le medaillon ###")
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75
def orz(im,x0,y0,x1,y1,tag,ech):
    px=im.load(); pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if est_or(px[x,y])]
    if not pts: print(f"  [{tag}] AUCUN"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  [{tag}] {len(pts)}px x {min(xs)}..{max(xs)} ({(max(xs)-min(xs)+1)/ech:.1f}CSS) y {min(ys)}..{max(ys)} ({(max(ys)-min(ys)+1)/ech:.1f}CSS)")
orz(K,540,200,640,235,'canon losange (attendu y 204..225)',EK)
orz(C,505,190,575,240,'c19 losange',EC)
print("\n### BANDEAU-ALERTE (canon top:78 CSS -> y 234..335 px) ###")
def bande_texte(im,x0,x1,y0,y1,tag,S):
    px=im.load(); 
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>S)
        if n>5: print(f"    [{tag}] y={y}: {n} px > L{S}")
print("  canon:")
bande_texte(K,100,1080,225,350,'canon alerte',110)
print("  capture 1920 (meme bande relative y 215..320):")
bande_texte(C,100,1000,200,330,'c19 alerte',110)
print("\n### libelle Verge-A ###")
def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[];cols=[];fonds=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            (cols if lum(c)>S else fonds).append(c)
            if lum(c)>S: xs.append(x);ys.append(y)
    if not xs: print(f"  [{tag}] rien"); return
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    fonds.sort(key=lum); fond=fonds[len(fonds)//2]
    print(f"  [{tag}] h={(max(ys)-min(ys)+1)/ech:.2f}CSS l={(max(xs)-min(xs)+1)/ech:.1f}CSS x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)} encre={ink} fond={fond} contraste={contraste(ink,fond):.2f}:1")
encre(C,50,155,300,205,'c19 Verge-A',EC,60)
