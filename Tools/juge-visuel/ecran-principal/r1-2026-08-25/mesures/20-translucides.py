# -*- coding: utf-8 -*-
"""Toutes les surfaces TRANSLUCIDES : couleur resultante mesuree sur le meme type de fond."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def M(im,x0,y0,x1,y1,tag):
    c=med(im,x0,y0,x1,y1); print(f"    {tag:46s} {c}  L={lum(c):6.1f}"); return c
print("\n=== 1. FOND du bouton-filet (.btn.ligne  #ffffff0a) vs plaque de la fiche ===")
kp=M(K,60,1690,120,1720,'canon plaque fiche (hors bouton)')
kb=M(K,470,1660,520,1700,'canon interieur bouton BLANCHIR')
cp=M(C,55,1590,120,1620,'c19 plaque fiche (hors bouton)')
cb=M(C,410,1470,450,1500,'c19 interieur bouton BLANCHIR')
print(f"    ecart interieur-plaque : canon {lum(kb)-lum(kp):+.1f} L   capture {lum(cb)-lum(cp):+.1f} L   -> x{(lum(cb)-lum(cp))/max(0.1,(lum(kb)-lum(kp))):.2f}")

print("\n=== 2. BORDURE du bouton-filet (#ffffff2a) ===")
kbd=M(K,431,1660,433,1700,'canon bordure gauche BLANCHIR (x431..432)')
cbd=M(C,395,1470,398,1500,'c19 bordure gauche BLANCHIR (x395..397)')
print(f"    ecart bordure-plaque : canon {lum(kbd)-lum(kp):+.1f}   capture {lum(cbd)-lum(cp):+.1f}   -> x{(lum(cbd)-lum(cp))/max(0.1,(lum(kbd)-lum(kp))):.2f}")

print("\n=== 3. SEPARATEUR des stats (#ffffff10) ===")
ks=M(K,419,1495,422,1565,'canon separateur 1 (x419..421)')
ksf=M(K,440,1495,470,1565,'canon plaque a cote du separateur')
cs=M(C,422,1355,425,1420,'c19 separateur 1 (x422..424)')
csf=M(C,445,1355,475,1420,'c19 plaque a cote du separateur')
print(f"    ecart separateur-plaque : canon {lum(ks)-lum(ksf):+.1f}   capture {lum(cs)-lum(csf):+.1f}   -> x{(lum(cs)-lum(csf))/max(0.1,(lum(ks)-lum(ksf))):.2f}")

print("\n=== 4. ARC du manometre (deja mesure) ===")
print("    canon froid (68,101,113) L=95.6  | capture (108,149,153) L=140.9  -> x1.47")
print("    canon chaud (132,70,61)  L=82.4  | capture (179,101,88)  L=116.9  -> x1.42")

print("\n=== 5. BOUTON OR : degrade vertical ===")
def grad(im,x,y0,y1,tag):
    px=im.load(); print(f"    [{tag}] x={x}: "+"  ".join(f"{y}:{px[x,y]}" for y in range(y0,y1,max(1,(y1-y0)//7))))
grad(K,120,1624,1736,'canon COLLECTER')
grad(C,100,1446,1532,'c19 COLLECTER')

print("\n=== 6. plaque de la fiche : couleur au meme endroit (sur le backdrop, hors art) ===")
M(C,36,1300,52,1600,'c19 fiche AU-DESSUS du backdrop (x36..52)')
print("    (canon: pas d equivalent, la fiche du canon est toujours sur l art)")
