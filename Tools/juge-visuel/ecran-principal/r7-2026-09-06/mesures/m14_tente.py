# -- m14 : y a-t-il un POLYGONE a bords DROITS dans le cadran du jeu ? coupes horizontales, couleurs brutes.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
for key,ys in [('c19',[24.0,28.0,32.0,36.0]),('ref',[23.0,27.0,31.0,35.0])]:
    s=sc(key); im=img(key); d=im.load()
    print("=== %s ==="%key)
    for yc in ys:
        yp=int(round(yc*s)); row=[]
        for xp in range(int(176*s), int(216*s)):
            row.append((xp/s, d[xp,yp]))
        # detecter les sauts
        print("  y=%.1f CSS : "%yc + " ".join("%.1f=%d,%d,%d"%(x,p[0],p[1],p[2]) for x,p in row[::3]))
