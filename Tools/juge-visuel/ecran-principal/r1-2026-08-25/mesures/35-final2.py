# -*- coding: utf-8 -*-
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
EK=3.0; EC=1080/392.0
def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])>S: xs.append(x);ys.append(y)
    if not xs: print(f"  [{tag}] rien"); return
    print(f"  [{tag}] cap={(max(ys)-min(ys)+1)/ech:.2f}CSS l={(max(xs)-min(xs)+1)/ech:.1f}CSS y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)}")
print("### CHALEUR / HEAT, fenetre serree bien a l'interieur de l'anneau ###")
encre(K,552,155,618,180,'canon HEAT',EK,80)
encre(C,496,148,586,182,'c19 CHALEUR',EC,80)
print("\n### barre de ratio: couleur le long de la largeur ###")
def scan(im,y,x0,x1,tag,pas):
    px=im.load(); print(f"  [{tag}] y={y}: "+"  ".join(f"{x}:{px[x,y]}" for x in range(x0,x1,pas)))
scan(K,124,48,272,'canon ratio y=124',20)
scan(C,113,199,392,'c19 ratio y=113',20)
