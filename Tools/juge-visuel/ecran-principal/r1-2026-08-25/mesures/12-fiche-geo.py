# -*- coding: utf-8 -*-
"""Fiche: bbox, filet laiton haut, rayon d'arrondi, bordure, translucidite."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75

def filet(im,y0,y1,tag):
    px=im.load(); W,H=im.size
    for y in range(y0,y1):
        xs=[x for x in range(W) if est_or(px[x,y])]
        if len(xs)>40:
            print(f"  [{tag}] filet laiton y={y}: {len(xs)} px or, x {min(xs)}..{max(xs)}")
def bord(im,y,x0,x1,tag):
    px=im.load()
    print(f"  [{tag}] y={y} : "+" ".join(f"{x}:{px[x,y]}" for x in range(x0,x1)))

print("\n=== CANON : filet haut de la fiche (attendu y=1273..1280) ===")
filet(K,1265,1290,'canon')
print("\n=== CAPTURE 1920 : filet haut de la fiche ===")
filet(C,1170,1200,'c19')
print("\n=== CAPTURE 2400 : filet haut de la fiche ===")
filet(C2,1655,1690,'c24')

print("\n=== bords lateraux de la fiche ===")
bord(K,1500,30,52,'canon x gauche @y1500')
bord(K,1500,1125,1147,'canon x droite @y1500')
bord(C,1400,25,48,'c19 x gauche @y1400')
bord(C,1400,1032,1055,'c19 x droite @y1400')
