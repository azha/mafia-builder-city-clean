# -- m49 : a 1080x2400, etendue des panneaux de fond (DistrictSceneBackdrop) au-dessus et au-dessous de l'art.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
for key in ['c24','d24','t24']:
    s=sc(key); im=img(key); d=im.load()
    print("=== %s : profil vertical a x=350 CSS (hors chrome et hors fiche) ==="%key)
    xp=int(round(350*s)); prev=None; runs=[]
    for yp in range(0,im.height):
        p=d[xp,yp]
        if prev is None or max(abs(p[c]-prev[c]) for c in range(3))>2:
            runs.append([yp/s,p,1]); prev=p
        else: runs[-1][2]+=1
    for y,p,n in runs:
        if n/s>=4.0: print("    y=%7.2f  %-16s  hauteur %.2f CSS"%(y,str(p),n/s))
