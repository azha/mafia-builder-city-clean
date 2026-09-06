# -- m02 : le FILET du bandeau : ligne, epaisseur, couleur. Convention de bord declaree dans le rapport.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def rows(key, target, tol, ybox=(40,70)):
    s=sc(key); im=img(key); d=im.load()
    out=[]
    for ypx in range(int(ybox[0]*s), int(ybox[1]*s)):
        n=0
        for xpx in range(0, im.width):
            p=d[xpx,ypx]
            if all(abs(p[c]-target[c])<=tol for c in range(3)): n+=1
        out.append((ypx, ypx/s, n))
    return out

print("=== canon : lignes riches en LAITON (176,141,62) +-20, largeur 1176 px ===")
for ypx,yc,n in rows('ref',(176,141,62),20):
    if n>50: print("  ypx=%4d  y=%7.3f CSS  n=%4d"%(ypx,yc,n))
print()
print("=== c19 : lignes riches en BRAISE (224,102,74) +-30 ===")
for ypx,yc,n in rows('c19',(224,102,74),30):
    if n>50: print("  ypx=%4d  y=%7.3f CSS  n=%4d"%(ypx,yc,n))
print()
print("=== c24 : lignes riches en BRAISE (224,102,74) +-30 ===")
for ypx,yc,n in rows('c24',(224,102,74),30):
    if n>50: print("  ypx=%4d  y=%7.3f CSS  n=%4d"%(ypx,yc,n))
