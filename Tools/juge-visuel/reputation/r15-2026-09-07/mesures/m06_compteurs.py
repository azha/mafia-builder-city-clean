"""m06 — localisation des 3 boites de compteurs et de l'encre CYAN.
Controle positif : la reference DOIT rendre 3 boites de largeurs voisines.
Controle negatif : le meme detecteur de cyan sur le panneau bas (texte creme/or) doit rendre ~0.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def est_cyan(c):
    r,g,b=c
    return b>120 and g>110 and (b-r)>45 and (g-r)>35

CFG={
 'reference-1080x2102.png': dict(boite=(702,819), bas=(1650,1920)),
 'capture-1080x2400.png'  : dict(boite=(727,845), bas=(1846,1974)),
 'capture-1080x1920.png'  : dict(boite=(494,613), bas=(1351,1621)),
}
for nom,c in CFG.items():
    print("="*74); im=ouvrir(nom); p=im.load()
    y0,y1=c['boite']
    # colonnes des bords de boites : bord clair
    cols=[]
    for x in range(0,1080):
        n=sum(1 for y in range(y0,y1+1) if lum(p[x,y])>lum(p[max(0,x-4),y])+7)
        cols.append((x,n))
    b=bandes(cols,int(0.7*(y1-y0)))
    print(f"  bords GAUCHES de boite (montee): {[(c0,c1) for c0,c1,_ in b]}")
    # encre cyan
    xs=[x for x in range(1080) if any(est_cyan(p[x,y]) for y in range(y0,y1+1))]
    if xs:
        grp=[];cur=[xs[0]]
        for x in xs[1:]:
            if x-cur[-1]<=20: cur.append(x)
            else: grp.append((cur[0],cur[-1])); cur=[x]
        grp.append((cur[0],cur[-1]))
        print(f"  groupes d'encre CYAN : {grp}")
        for gx0,gx1 in grp:
            ys=[y for y in range(y0,y1+1) if any(est_cyan(p[x,y]) for x in range(gx0,gx1+1))]
            n=sum(1 for y in range(y0,y1+1) for x in range(gx0,gx1+1) if est_cyan(p[x,y]))
            print(f"     x{gx0}..{gx1} (w={gx1-gx0+1})  y{ys[0]}..{ys[-1]} (h={ys[-1]-ys[0]+1})  npix={n}")
    yb0,yb1=c['bas']
    ncy=sum(1 for y in range(yb0,yb1+1) for x in range(60,1020) if est_cyan(p[x,y]))
    print(f"  [ctrl negatif] pixels cyan dans le panneau bas = {ncy} (attendu ~0)")
