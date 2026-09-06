import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
for key,xc,yc in [('ref',196.0,43.67),('c19',196.0,45.19)]:
    s=sc(key); im=img(key); d=im.load()
    print("=== %s : coupe HORIZONTALE du pivot a y=%.2f ==="%(key,yc))
    yp=int(round(yc*s))
    for xp in range(int((xc-4)*s), int((xc+4)*s)+1):
        p=d[xp,yp]; print("   x=%7.3f  %-16s  R−B=%4d"%(xp/s,str(p),p[0]-p[2]))
    print("=== %s : coupe VERTICALE du pivot a x=%.2f ==="%(key,xc))
    xp=int(round(xc*s))
    for yp in range(int((yc-4)*s), int((yc+4)*s)+1):
        p=d[xp,yp]; print("   y=%7.3f  %-16s  R−B=%4d"%(yp/s,str(p),p[0]-p[2]))
