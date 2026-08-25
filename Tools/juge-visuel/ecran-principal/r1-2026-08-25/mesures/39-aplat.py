# -*- coding: utf-8 -*-
"""Etendue exacte de l'aplat de remplissage (hors plaque du dock)."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def compte(im,zones,tag,H,W=1080):
    tot=sum((y1-y0)*(x1-x0) for x0,y0,x1,y1 in zones)
    print(f"  [{tag}] aplat = {tot} px sur {W*H} = {100.0*tot/(W*H):.1f}% de l'ecran")
    for x0,y0,x1,y1 in zones:
        print(f"       bloc x {x0}..{x1} y {y0}..{y1} = {(x1-x0)}x{(y1-y0)} px  = {(x1-x0)/2.7551:.1f} x {(y1-y0)/2.7551:.1f} CSS")
print("### 1080x1920 ###")
compte(C,[(0,134,1080,240),(0,240,54,1654),(1026,240,1080,1654)],'c19',1920)
print("### 1080x2400 ###")
compte(C2,[(0,134,1080,480),(0,480,54,2134),(1026,480,1080,2134)],'c24',2400)
print("\n### verification que ces blocs sont bien unis ###")
def uni(im,x0,y0,x1,y1,t):
    px=im.load(); L=sorted(lum(px[x,y]) for y in range(y0,y1,3) for x in range(x0,x1,3))
    print(f"    {t}: L min={L[0]:.1f} max={L[-1]:.1f} etendue={L[-1]-L[0]:.1f}")
uni(C,0,242,54,1650,'c19 bande gauche')
uni(C,1026,242,1080,1650,'c19 bande droite')
uni(C,0,205,1080,238,'c19 bande haute (hors Verge-A)')
uni(C2,0,220,1080,478,'c24 bande haute')
