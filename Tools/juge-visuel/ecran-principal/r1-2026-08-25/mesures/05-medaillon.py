# -*- coding: utf-8 -*-
"""Medaillon: cercle laiton (centre+diametre), aiguille (angle), arcs (etendue+couleur)."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'

def est_or(c):
    r,g,b=c
    return r>110 and r-b>45 and g>80 and abs(r-g)<90

def cercle_or(im, x0,x1,y0,y1, tag):
    """bbox des pixels 'laiton' dans la fenetre -> centre et diametre du cercle du boitier"""
    px=im.load()
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if est_or(px[x,y]): xs.append(x); ys.append(y)
    if not xs: print(f"  [{tag}] aucun pixel laiton"); return None
    print(f"  [{tag}] laiton bbox x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})  y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1}) n={len(xs)}")
    return (min(xs),min(ys),max(xs),max(ys))

print("=== fenetres choisies a la main autour du medaillon ===")
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
# canon: medaillon 64x64 CSS a (164,8) -> px (492,24)..(684,216)
print("\n-- canon (attendu: 64 CSS = 192 px, a x 492..684, y 24..216) --")
cercle_or(K, 460, 720, 10, 240, 'canon medaillon')
print("\n-- capture 1920 --")
cercle_or(C, 400, 690, 0, 260, 'c1920 medaillon')
print("\n-- capture 2400 --")
cercle_or(C2, 400, 690, 0, 260, 'c2400 medaillon')
