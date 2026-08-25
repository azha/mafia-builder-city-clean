# -*- coding: utf-8 -*-
"""Ronds du dock: profil horizontal complet a mi-hauteur, sur le fond le plus contraste."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def prof(im,y,x0,x1,tag,ech,seuil=5):
    px=im.load(); prev=None; out=[]
    for x in range(x0,x1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>seuil: out.append((x,round(prev),round(L)))
        prev=L
    print(f"  [{tag}] y={y}: "+" | ".join(f"{x}:{a}->{b}" for x,a,b in out))
print("### canon rond 1 (attendu 46 CSS = 138 px, x 213..350) ###")
prof(K,1916,190,380,'canon y=1916',3.0)
print("### capture 2400 rond 1 (fond sombre) ###")
for y in (2240,2252,2265):
    prof(C2,y,190,380,f'c24 y={y}',1080/392.0)
print("### capture 1920 rond 1 (fond teal) ###")
for y in (1760,1772,1785):
    prof(C,y,190,380,f'c19 y={y}',1080/392.0)
print("\n### extension verticale du rond 1 (colonne au centre du rond) ###")
def vprof(im,x,y0,y1,tag,seuil=5):
    px=im.load(); prev=None; out=[]
    for y in range(y0,y1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>seuil: out.append((y,round(prev),round(L)))
        prev=L
    print(f"  [{tag}] x={x}: "+" | ".join(f"{y}:{a}->{b}" for y,a,b in out))
vprof(K,281,1830,2010,'canon x=281')
vprof(C2,276,2180,2330,'c24 x=276')
vprof(C,276,1690,1850,'c19 x=276')
