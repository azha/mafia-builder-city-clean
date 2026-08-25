# -*- coding: utf-8 -*-
"""Losange, volutes, identite de mise en page entre les 2 resolutions, debordements."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')
EK=3.0; EC=1080/392.0
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75
def orz(im,x0,y0,x1,y1,tag,ech):
    px=im.load(); pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if est_or(px[x,y])]
    if not pts: print(f"  [{tag}] AUCUN"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  [{tag}] {len(pts)}px  l={(max(xs)-min(xs)+1)/ech:.1f}CSS h={(max(ys)-min(ys)+1)/ech:.1f}CSS  centre=({(min(xs)+max(xs))/2/ech:.1f},{(min(ys)+max(ys))/2/ech:.1f}) CSS")
print("### LOSANGE (canon: 7x7 CSS tourne 45deg -> bbox ~9.9 CSS, centre y~79.5 CSS) ###")
orz(K,560,196,620,222,'canon losange (fenetre serree, avant la bulle 2)',EK)
orz(C,515,195,565,225,'c19 losange',EC)
orz(C2,515,195,565,225,'c24 losange',EC)
print("\n### VOLUTES ###")
def maxi(im,x0,y0,x1,y1,t):
    px=im.load(); b=max(((lum(px[x,y]),px[x,y],x,y) for y in range(y0,y1) for x in range(x0,x1)))
    print(f"    {t:48s} L max={b[0]:6.1f} {b[1]} a ({b[2]},{b[3]})")
maxi(K,14,66,88,100,'canon volute gauche (x14..88 y66..100)')
maxi(K,1092,40,1160,66,'canon volute droite (x1092..1160 y40..66)')
maxi(C,1008,50,1076,110,'c19 zone volute droite (x1008..1076)')
maxi(C,150,55,195,110,'c19 zone volute gauche entre fleche et ARGENT')
print("\n### mise en page identique entre les 2 resolutions ? (masque d encre de la fiche) ###")
p1=C.load(); p2=C2.load(); d=0;n=0
for y in range(0,466):
    for x in range(33,1047):
        a=lum(p1[x,1188+y])>110; b=lum(p2[x,1668+y])>110
        n+=1
        if a!=b: d+=1
print(f"  masque L>110 : {d} pixels differents sur {n} ({100.0*d/n:.3f}%)  -> mise en page de la fiche identique")
d=0;n=0
for y in range(0,266):
    for x in range(150,930):
        a=lum(p1[x,1654+y])>110; b=lum(p2[x,2133+y])>110
        n+=1
        if a!=b: d+=1
print(f"  dock masque L>110 : {d}/{n} ({100.0*d/n:.2f}%) -> le FOND differe (teal vs plaque), pas la geometrie")

print("\n### debordements / troncatures ###")
def bords(im,tag):
    px=im.load(); W,H=im.size
    # de l'encre touche-t-elle un bord ?
    for nom,pts in (('haut',[(x,0) for x in range(W)]),('bas',[(x,H-1) for x in range(W)]),
                    ('gauche',[(0,y) for y in range(H)]),('droite',[(W-1,y) for y in range(H)])):
        n=sum(1 for x,y in pts if lum(px[x,y])>90)
        print(f"    [{tag}] bord {nom}: {n} px d'encre (L>90) touchent le bord")
bords(C,'c19'); bords(C2,'c24')
