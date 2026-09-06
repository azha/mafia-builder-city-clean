# -- m25 : distance entre la fin du bloc ARGENT et le MEDAILLON (critere de sortie de l'assume).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
key='c19'; s=sc(key); im=img(key); d=im.load()
orvif = lambda p: abs(p[0]-242)<22 and abs(p[1]-201)<26 and abs(p[2]-107)<38 and p[0]-p[2]>90
braise= lambda p: p[0]-p[2]>40 and p[0]>90 and p[1]<p[0]-30
print("  image", im.size)
xr=0; yr=None
for yp in range(int(24*s),int(39*s)):
    for xp in range(int(120*s),int(200*s)):
        if orvif(d[xp,yp]) and xp/s>xr: xr=xp/s; yr=yp/s
print("  dernier pixel OR-VIF du bloc argent : x=%.2f CSS (y=%.2f)"%(xr,yr))
# premier pixel braise sur les memes lignes
xb=999
for yp in range(int(24*s),int(39*s)):
    for xp in range(int(150*s),int(200*s)):
        if braise(d[xp,yp]):
            if xp/s<xb: xb=xp/s; yb=yp/s
            break
print("  premier pixel BRAISE (halo du cerclage) sur ces lignes : x=%.2f CSS (y=%.2f)"%(xb,yb))
print("  ⇒ jour visible entre l'encre ARGENT et la lueur du medaillon : %.2f CSS"%(xb-xr))
print("  bord EXTERIEUR NOMINAL du cerclage (m09) : x = 195.817 - 33.64 = %.2f  ⇒ jour a l'anneau nominal : %.2f CSS"%(195.817-33.64, (195.817-33.64)-xr))
print()
print("  == canon, meme mesure ==")
key='ref'; s=sc(key); im=img(key); d=im.load()
xr=0
for yp in range(int(19*s),int(37*s)):
    for xp in range(int(60*s),int(190*s)):
        if orvif(d[xp,yp]) and xp/s>xr: xr=xp/s; yr=yp/s
print("  dernier pixel OR-VIF : x=%.2f (y=%.2f) ; bord ext. nominal du cerclage x=%.2f ⇒ jour %.2f CSS"%(xr,yr,195.84-32.00,(195.84-32.00)-xr))
