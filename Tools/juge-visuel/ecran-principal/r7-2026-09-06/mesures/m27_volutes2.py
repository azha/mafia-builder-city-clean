# -- m27 : volutes, sonde DURCIE : detachement ABSOLU (plus clair OU plus sombre que les voisines a +-2 px),
#    seuil 12, longueur >= 5 CSS. Controle de CAPACITE : la meme sonde doit trouver la hampe de la fleche
#    retour dans la capture (structure fine et claire, ~6 CSS) ⇒ elle n'est pas aveugle sur cette image.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
def segments(key, y0=6, y1=50, dmin=12, lmin=5.0):
    s=sc(key); im=img(key); d=im.load(); W=im.width
    res=[]
    for yp in range(int(y0*s), int(y1*s)):
        run=None
        for xp in range(0,W):
            p=d[xp,yp]; a=d[xp,max(yp-2,0)]; b=d[xp,min(yp+2,im.height-1)]
            det = min(abs(lum(p)-lum(a)),abs(lum(p)-lum(b)))
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
    for y,x0,x1,L,c in r: print("   y=%7.3f  x %7.2f..%7.2f (L=%5.2f)  %s"%(y,x0,x1,L,str(c)))
    if not r: print("   AUCUN")
