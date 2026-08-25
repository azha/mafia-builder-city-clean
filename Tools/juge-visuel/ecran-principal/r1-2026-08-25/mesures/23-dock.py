# -*- coding: utf-8 -*-
"""Dock: fond, ronds (centre/diametre/remplissage/bordure), libelles, indicateur actif."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
def M(im,x0,y0,x1,y1,t):
    c=med(im,x0,y0,x1,y1); print(f"    {t:50s} {c} L={lum(c):6.1f}"); return c

print("### FOND du dock (bandes horizontales) ###")
print("  canon dock y 1817..2088 (90.17 CSS), x 3..1173")
for y in (1825,1860,1900,1950,2000,2050,2085): M(K,60,y,160,y+6,f'canon fond dock y={y}')
print("  capture 1920: bande basse y 1654..1920")
for y in (1660,1700,1750,1800,1850,1900,1914): M(C,60,y,160,y+6,f'c19 fond y={y}')
print("  capture 2400: bande basse y 2133..2400")
for y in (2140,2200,2260,2320,2380,2394): M(C2,60,y,160,y+6,f'c24 fond y={y}')

print("\n### RONDS: profil horizontal a mi-hauteur ###")
def ronds(im,y,x0,x1,tag,ech,seuilbas=True):
    px=im.load(); base=lum(med(im,x0,y-2,x0+30,y+2))
    seg=[];deb=None
    for x in range(x0,x1):
        L=lum(px[x,y]); dark = L < base-12
        if dark and deb is None: deb=x
        if not dark and deb is not None:
            if x-deb>20: seg.append((deb,x-1))
            deb=None
    if deb is not None: seg.append((deb,x1-1))
    print(f"  [{tag}] y={y} fond L={base:.1f} ; ronds:")
    for a,b in seg:
        print(f"      x {a}..{b}  diam={b-a+1}px = {(b-a+1)/ech:.1f} CSS  centre={(a+b)/2:.1f}px = {(a+b)/2/ech:.1f} CSS")
    return seg
ronds(C,1806,40,1040,'c19 ronds',1080/392.0)
ronds(C2,2286,40,1040,'c24 ronds',1080/392.0)
print("  canon: les ronds sont PLUS CLAIRS que rien -> profil par transition")
def ronds_k(im,y,x0,x1,tag,ech):
    px=im.load(); prev=None; out=[]
    for x in range(x0,x1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>6: out.append((x,round(prev),round(L)))
        prev=L
    print(f"  [{tag}] y={y}: "+" | ".join(f"{x}:{a}->{b}" for x,a,b in out))
ronds_k(K,1916,150,1050,'canon ronds y=1916 (milieu des ronds)',3.0)
