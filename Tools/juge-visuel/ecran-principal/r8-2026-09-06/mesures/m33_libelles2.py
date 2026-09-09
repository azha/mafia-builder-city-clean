# -*- coding: utf-8 -*-
"""m33 - correction de m32 : la queue INTERIEURE du halo braise du jeu atteint r=31.15 et etait
comptee comme encre de `.heatpct`. On borne la recherche a r <= 28 CSS et on garde la plus grosse
COMPOSANTE CONNEXE (les glyphes), puis on mesure le coin le plus eloigne de CETTE composante.
CONTROLE : sur le canon, `.heatpct` doit rendre une boite ~22 x 13 CSS (le r7 mesurait 22.67 x 13.00)."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
def comps(S):
    vus=set(); out=[]
    for s in S:
        if s in vus: continue
        p=[s]; vus.add(s); c=[]
        while p:
            q=p.pop(); c.append(q)
            for dx in(-1,0,1):
                for dy in(-1,0,1):
                    r=(q[0]+dx,q[1]+dy)
                    if r in S and r not in vus: vus.add(r); p.append(r)
        out.append(c)
    out.sort(key=len,reverse=True); return out
print("=== m33 : libelles du cadran (bornes a r<=28 CSS) ===")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    a=ANC[cle]; cx,cy=a['cx'],a['cy']; rint=a['r_nom_int']
    for nom,test in [('.heatpct',lambda c: dist_max(c,JETONS['braise'])<=60 or dist_max(c,JETONS['creme'])<=45),
                     ('.heatlib',lambda c: dist_max(c,JETONS['creme-2'])<=45)]:
        S=set()
        for yy in range(int((cy-6)*f),int((cy+29)*f)):
            for xx in range(int((cx-30)*f),int((cx+30)*f)):
                d=math.hypot(xx/f-cx, yy/f-cy)
                if d>28.0 or d<3.6: continue
                if test(px[xx,yy]): S.add((xx,yy))
        if len(S)<40: print("   %-6s %-9s : %d px"%(cle,nom,len(S))); continue
        C=comps(S)
        # les glyphes d'un mot : on garde toutes les composantes >= 8 % de la plus grosse
        seuil=max(8,len(C[0])*0.08)
        G=[p for c in C if len(c)>=seuil for p in c]
        xs=[p[0]/f for p in G]; ys=[p[1]/f for p in G]
        dmax=max(math.hypot(p[0]/f-cx,p[1]/f-cy) for p in G)
        print("   %-6s %-9s : %d comps retenues / %d ; boite %.2f x %.2f CSS ; centre vertical %+.2f du centre du boitier ;"
              " coin le plus loin r=%.2f = %.3f du rayon INTERIEUR (%.2f) ; DEGAGEMENT %.2f CSS"
              %(cle,nom,sum(1 for c in C if len(c)>=seuil),len(C),max(xs)-min(xs),max(ys)-min(ys),
                ((min(ys)+max(ys))/2)-cy,dmax,dmax/rint,rint,rint-dmax))
