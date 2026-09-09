# -*- coding: utf-8 -*-
"""m14 - filet : liste des interruptions ; rampe des extremites. Volutes : presence/position/opacite.
CONTROLE DE CAPACITE de la sonde a volutes : elle doit trouver la hampe de la fleche retour dans
la capture (un segment horizontal fin, clair) -- si elle ne la trouve pas, elle est aveugle."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *

print("=== m14 ===")
print("\n-- FILET : interruptions (colonnes CSS ou l'encre braise/laiton manque sur la ligne du filet)")
for cle,ycss in [('canon',51.67),('j1920',51.54),('j2400',51.54),('t2400',51.54)]:
    im,f=ouvrir(cle); px=im.load(); W,H=im.size
    i=int(round(ycss*f))
    on=[]
    for xx in range(W):
        c=px[xx,i]
        on.append((c[0]-c[2])>=45 and c[0]>=110)
    # runs de OFF entre le premier et le dernier ON
    prem=on.index(True); der=len(on)-1-on[::-1].index(True)
    trous=[]; deb=None
    for k in range(prem,der+1):
        if not on[k] and deb is None: deb=k
        elif on[k] and deb is not None:
            trous.append((deb/f,(k-1)/f)); deb=None
    if deb is not None: trous.append((deb/f,der/f))
    gros=[t for t in trous if t[1]-t[0]>=0.5]
    print("   %-6s : encre de %.1f a %.1f CSS ; %d trous >=0.5 CSS : %s"
          %(cle,prem/f,der/f,len(gros)," ".join("%.1f-%.1f(%.1f)"%(a,b,b-a) for a,b in gros[:12])))
    # rampe : intensite (R-B) tous les 10 CSS
    ech=[]
    for xc in range(0,392,20):
        xi=min(W-1,int(xc*f)); c=px[xi,i]; ech.append("%d:%d"%(xc,c[0]-c[2]))
    print("      rampe (x CSS : R-B) %s"%(" ".join(ech)))

print("\n-- VOLUTES (canon : 2 segments fins, y 25.3..26.3 CSS, x 5.0..17.3 et 370.3..387.0, opacite .28)")
def segments_fins(cle, x0,x1, y0=14.0,y1=40.0, lmin=None):
    """cherche des pixels nettement plus CLAIRS que la mediane locale de leur colonne."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    hits=[]
    for yy in range(int(y0*f),int(y1*f)):
        for xx in range(int(x0*f),int(x1*f)):
            c=px[xx,yy]
            vois=[L(px[xx,yy+k]) for k in (-6,-5,5,6)]
            if L(c) - mediane(vois) >= 6.0: hits.append((xx/f,yy/f,c))
    return hits
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    for nom,(x0,x1) in [('GAUCHE',(0.0,30.0)),('DROITE',(360.0,392.0))]:
        h=segments_fins(cle,x0,x1)
        if not h:
            print("   %-6s volute %-6s : AUCUN segment"%(cle,nom)); continue
        xs=[p[0] for p in h]; ys=[p[1] for p in h]
        c=tuple(int(mediane([p[2][k] for p in h])) for k in range(3))
        print("   %-6s volute %-6s : %d px  x %.2f..%.2f  y %.2f..%.2f  couleur mediane %s"
              %(cle,nom,len(h),min(xs),max(xs),min(ys),max(ys),c))
print("   [controle de capacite] la sonde trouve-t-elle la fleche retour du jeu (x 26..46 CSS) ?")
for cle in ['j1920','j2400']:
    h=segments_fins(cle,24.0,50.0)
    if h:
        xs=[p[0] for p in h]; ys=[p[1] for p in h]
        print("      %-6s : OUI, %d px  x %.2f..%.2f  y %.2f..%.2f"%(cle,len(h),min(xs),max(xs),min(ys),max(ys)))
    else: print("      %-6s : NON -> sonde aveugle"%cle)
