# -- m26 : VOLUTES. Sonde = segments HORIZONTAUX (>=8 CSS) dont la ligne se detache de ses voisines de +-2 px.
#    Balayage de TOUT le bandeau (y 6..50) : la cible du jeu a pu BOUGER (bloc ARGENT decale de +48 CSS).
#    Controle positif : le canon doit rendre 2 segments (gauche ~x8..30, droite ~x352..378).
#    Controle negatif : la barre de ratio (or) et le filet doivent aussi sortir ⇒ la sonde n'est pas aveugle.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def segments(key, y0=6, y1=50, dmin=14, lmin=8.0):
    s=sc(key); im=img(key); d=im.load(); W=im.width
    res=[]
    for yp in range(int(y0*s), int(y1*s)):
        run=None
        for xp in range(0,W):
            p=d[xp,yp]; a=d[xp,max(yp-2,0)]; b=d[xp,min(yp+2,im.height-1)]
            det = lum(p)-max(lum(a),lum(b))
            if det>=dmin:
                if run is None: run=[xp,xp]
                else: run[1]=xp
            else:
                if run and (run[1]-run[0]+1)/s>=lmin: res.append((yp/s,run[0]/s,(run[1]+1)/s,(run[1]-run[0]+1)/s, d[(run[0]+run[1])//2,yp]))
                run=None
        if run and (run[1]-run[0]+1)/s>=lmin: res.append((yp/s,run[0]/s,(run[1]+1)/s,(run[1]-run[0]+1)/s, d[(run[0]+run[1])//2,yp]))
    return res

for key in ['ref','c19','c24']:
    print("=== %s ==="%key)
    r=segments(key)
    # regrouper par y
    for y,x0,x1,L,c in r:
        print("   y=%7.3f  x %7.2f..%7.2f  (L=%5.2f CSS)  couleur %s"%(y,x0,x1,L,str(c)))
    if not r: print("   AUCUN segment")
