# -*- coding: utf-8 -*-
"""m23 - le DOCK : marche de luminance au bord haut, profil du voile, contraste des 4 libelles.
Le canon pose `.dock{background:linear-gradient(180deg,transparent,#070b12d8 40%)}` : rampe sur
40 % de la hauteur du dock (90.17 CSS -> 36.07 CSS) puis PLATEAU.
Le dock du canon commence a y=605.70 CSS ; en jeu, la hauteur d'ecran est 696.9 CSS (1920) et
871.1 CSS (2400) -- le dock est ancre EN BAS, on le localise par les ronds.
Contraste : encre des libelles (--creme-2 = 185,173,146) contre le fond MEDIAN sous le libelle."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
print("=== m23 : dock ===")

def ronds(cle, hcss):
    """localise les 4 ronds : disques sombres cernes, dans le tiers bas."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    # ligne ou l'on trouve 4 minima larges : on cherche par le liseré #ffffff22 -> plutot par le fond sombre
    best=None
    for yy in range(int((hcss-110)*f), int((hcss-20)*f)):
        seq=[L(px[xx,yy])<14 for xx in range(0,int(392*f))]
        runs=[];d=None
        for k,v in enumerate(seq):
            if v and d is None: d=k
            elif not v and d is not None:
                if (k-d)/f>25: runs.append((d/f,(k-1)/f))
                d=None
        if len(runs)==4 and (best is None or (runs[0][1]-runs[0][0])>best[1]):
            best=(yy/f, runs[0][1]-runs[0][0], runs)
    return best

for cle,hcss in [('canon',696.88),('j1920',696.88),('j2400',871.06)]:
    im,f=ouvrir(cle); px=im.load(); W,H=im.size
    r=ronds(cle,hcss)
    if r: print("\n-- %s : ligne des ronds y=%.2f ; diametres/centres : %s"
                %(cle,r[0]," ".join("[%.2f..%.2f] O=%.2f c=%.2f"%(a,b,b-a,(a+b)/2) for a,b in r[2])))
    else: print("\n-- %s : ronds non localises"%cle); continue
    # profil de luminance vertical dans une colonne SANS rond ni libelle : x = 55 CSS (entre bord et rond 1)
    for xc in [22.0, 55.0, 128.0]:
        xi=int(xc*f)
        prof=[(j/f, L(px[xi,j])) for j in range(int((hcss-115)*f), min(H,int(hcss*f)))]
        ech=[p for p in prof if abs(p[0]*2-round(p[0]*2))<1e-9]
        print("     x=%5.1f : L(y) %s"%(xc," ".join("%.0f:%.0f"%(y,v) for y,v in ech[::4])))
    # marche : plus grande chute de L sur 3 CSS, colonne x=22
    xi=int(22*f); prof=[(j/f,L(px[xi,j])) for j in range(int((hcss-115)*f), min(H,int(hcss*f)))]
    md=None
    for k in range(len(prof)-int(3*f)):
        d=prof[k][1]-prof[k+int(3*f)][1]
        if md is None or d>md[0]: md=(d,prof[k][0])
    print("     MARCHE maximale sur 3 CSS (x=22) : %.1f L a y=%.2f"%(md[0],md[1]))
