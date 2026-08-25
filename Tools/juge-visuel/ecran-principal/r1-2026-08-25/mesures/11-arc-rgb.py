# -*- coding: utf-8 -*-
"""Couleur brute de l'arc en fonction de l'angle (autour du moyeu), et largeur radiale de la bande."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def bande(im,cx,cy,rmin,rmax,tag,pas=6):
    px=im.load()
    print(f"\n  [{tag}] couleur MAX-saturation sur r={rmin}..{rmax}, par angle")
    for a in range(-96,97,pas):
        rad=math.radians(a); best=None
        for r in range(rmin,rmax+1):
            x=int(round(cx+r*math.sin(rad))); y=int(round(cy-r*math.cos(rad)))
            c=px[x,y]; s=max(c)-min(c)
            if best is None or s>best[1]: best=(c,s,r)
        c=best[0]
        print(f"     {a:+4d}deg  r={best[2]:2d}  {c}   sat={best[1]}")
print("### CANON (moyeu 588,131 ; bande r 46..56) ###")
bande(K,588,131,46,56,'canon')
print("\n### CAPTURE 1920 (moyeu 540,90 ; bande r 38..52) ###")
bande(C,540,90,38,52,'c19')
