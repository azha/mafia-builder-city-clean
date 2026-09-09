# -- m24 : barre de ratio — longueur OR, PISTE eventuelle, epaisseur (coupe verticale, convention mi-alpha/coeur).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
print("=== coupe HORIZONTALE le long de la barre (canon y=42.33 ; jeu y=44.4) ===")
for key,yc,x0,x1 in [('ref',42.33,10,100),('c19',44.45,58,180),('c24',44.45,58,180)]:
    s=sc(key); im=img(key); d=im.load(); yp=int(round(yc*s))
    print("  %s y=%.2f (px %d)"%(key,yc,yp))
    prev=None; segs=[]
    for xp in range(int(x0*s),int(x1*s)):
        p=d[xp,yp]
        if p!=prev:
            segs.append([xp/s,p,1]); prev=p
        else: segs[-1][2]+=1
    for x,p,n in segs:
        if n*1.0/s>0.3: print("     x=%7.3f  %-16s  (%d px = %.2f CSS)"%(x,str(p),n,n/s))
print()
print("=== coupe VERTICALE au milieu de la barre ===")
for key,xc,y0,y1 in [('ref',40.0,40,46),('c19',100.0,42,48),('c24',100.0,42,48)]:
    s=sc(key); im=img(key); d=im.load(); xp=int(round(xc*s))
    print("  %s x=%.1f"%(key,xc))
    for yp in range(int(y0*s),int(y1*s)):
        p=d[xp,yp]; print("     y=%7.3f  %-16s L=%.1f"%(yp/s,str(p),lum(p)))
