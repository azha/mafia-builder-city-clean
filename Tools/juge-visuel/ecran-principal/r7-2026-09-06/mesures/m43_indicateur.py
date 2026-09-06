# -- m43 : trait d'onglet ACTIF : segments dores contigus dans la bande sous les ronds.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222,'t24':174.222}
dore = lambda p: (p[0]-p[2])>60 and p[0]>120 and p[1]>90
for key in ['ref','c19','c24','t24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    print("=== %s ==="%key)
    for yp in range(int((658+dy)*s),int((672+dy)*s)):
        runs=[]
        for xp in range(int(60*s),int(340*s)):
            if dore(d[xp,yp]):
                if runs and xp==runs[-1][1]+1: runs[-1][1]=xp
                else: runs.append([xp,xp])
        runs=[r for r in runs if (r[1]-r[0]+1)/s>=2.0]
        if runs:
            print("   y=%7.3f : "%(yp/s-dy)+" · ".join("x %.2f..%.2f (l=%.2f) %s"%(a/s,(b+1)/s,(b+1-a)/s,str(d[(a+b)//2,yp])) for a,b in runs))
