# -*- coding: utf-8 -*-
"""m32 - les deux libelles du cadran : boite, position par rapport au centre du boitier,
et DEGAGEMENT au cerclage (distance du coin d'encre le plus eloigne au rayon INTERIEUR nominal).
Encre : `.heatpct` = --braise en etat chaud (jeu) / --creme (canon) ; `.heatlib` = --creme-2."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
print("=== m32 : libelles du cadran ===")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    a=ANC[cle]; cx,cy=a['cx'],a['cy']; rint=a['r_nom_int']
    for nom,test in [('.heatpct',lambda c: dist_max(c,JETONS['braise'])<=55 or dist_max(c,JETONS['creme'])<=45),
                     ('.heatlib',lambda c: dist_max(c,JETONS['creme-2'])<=45)]:
        P=[]
        for yy in range(int(cy*f),int((cy+34)*f)):
            for xx in range(int((cx-34)*f),int((cx+34)*f)):
                d=math.hypot(xx/f-cx, yy/f-cy)
                if d>rint-0.2: continue
                if d<3.5: continue
                if test(px[xx,yy]): P.append((xx/f,yy/f,d))
        if len(P)<40: print("   %-6s %-9s : %d px (trop peu)"%(cle,nom,len(P))); continue
        xs=[p[0] for p in P]; ys=[p[1] for p in P]
        dmax=max(p[2] for p in P)
        print("   %-6s %-9s : %4d px ; boite %.2f x %.2f CSS ; centre a %+.2f du centre du boitier ;"
              " coin le plus loin r=%.2f = %.3f du rayon INTERIEUR (%.2f) ; DEGAGEMENT %.2f CSS"
              %(cle,nom,len(P),max(xs)-min(xs),max(ys)-min(ys),((min(ys)+max(ys))/2)-cy,dmax,dmax/rint,rint,rint-dmax))
