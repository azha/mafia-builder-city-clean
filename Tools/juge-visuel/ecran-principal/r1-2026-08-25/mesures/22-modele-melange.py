# -*- coding: utf-8 -*-
"""Une seule variable: le MEME token translucide, sur le MEME fond mesure. sRGB vs lineaire."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def lin(v): 
    v=v/255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def unlin(u):
    u=max(0.0,min(1.0,u))
    s = u*12.92 if u<=0.0031308 else 1.055*(u**(1/2.4))-0.055
    return round(s*255)
def melange(fond, encre, a):
    srgb=tuple(round(a*encre[i]+(1-a)*fond[i]) for i in range(3))
    linr=tuple(unlin(a*lin(encre[i])+(1-a)*lin(fond[i])) for i in range(3))
    return srgb, linr
def dist(a,b): return sum(abs(a[i]-b[i]) for i in range(3))/3.0

cas=[
 ('bordure du bouton-filet  alpha=42/255', (255,255,255), 42/255.0,
   med(K,48,1650,84,1730), med(K,431,1650,433,1730),
   med(C,45,1450,74,1530), med(C,395,1450,398,1530)),
 ('fond du bouton-filet     alpha=10/255', (255,255,255), 10/255.0,
   med(K,48,1650,84,1730), med(K,470,1660,520,1700),
   med(C,45,1450,74,1530), med(C,410,1470,450,1500)),
 ('separateur des stats     alpha=16/255', (255,255,255), 16/255.0,
   med(K,440,1495,470,1565), med(K,419,1495,422,1565),
   med(C,445,1355,475,1420), med(C,422,1355,425,1420)),
]
for nom, encre, a, kf, kr, cf, cr in cas:
    print(f"\n=== {nom} ===")
    for tag, fond, reel in (('CANON',kf,kr),('CAPTURE',cf,cr)):
        s,l = melange(fond, encre, a)
        print(f"  {tag:8s} fond mesure={fond}  resultat MESURE={reel}")
        print(f"           prediction sRGB    ={s}  ecart moyen={dist(s,reel):5.1f}/255")
        print(f"           prediction LINEAIRE={l}  ecart moyen={dist(l,reel):5.1f}/255")
