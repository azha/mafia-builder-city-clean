# -*- coding: utf-8 -*-
"""Translucidite de la fiche : l'art transparait-il ? (dispersion dans une bande sans texte)"""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png')

def stats_bande(im,x0,x1,y0,y1,tag):
    px=im.load(); L=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            L.append(lum(px[x,y]))
    L.sort(); n=len(L)
    p5=L[int(n*0.05)]; p50=L[n//2]; p95=L[int(n*0.95)]
    print(f"  [{tag}] n={n}  L p5={p5:.1f}  p50={p50:.1f}  p95={p95:.1f}  etendue p5-p95={p95-p5:.1f}  min={L[0]:.1f} max={L[-1]:.1f}")
    return p5,p50,p95

print("=== bande INTERIEURE de la fiche, SANS texte ===")
print("  canon: fiche x 39..1136, y 1280..1781 ; bande sans texte = juste sous le filet, y 1285..1315")
stats_bande(K,60,1115,1286,1316,'canon haut de fiche (sans texte)')
print("  canon: bande basse sous les boutons y 1740..1775")
stats_bande(K,60,1115,1738,1775,'canon bas de fiche')
print()
print("  c19: fiche x 33..1046, y 1188..1650 ; bande juste sous le filet y 1195..1225")
stats_bande(C,55,1025,1195,1225,'c19 haut de fiche (sans texte)')
print("  c19: bande basse sous les boutons y 1550..1640")
stats_bande(C,55,1025,1550,1640,'c19 bas de fiche')
print()
print("  c24: fiche y 1668..2133 ; bande basse y 2030..2120")
stats_bande(C2,55,1025,2030,2120,'c24 bas de fiche')

print("\n=== CONTROLE : la meme mesure sur une zone certainement UNIE (backdrop) ===")
stats_bande(C,60,1000,220,238,'c19 backdrop (temoin uni)')
print("\n=== bord de la fiche : y a-t-il un liser clair de 1 CSS ? ===")
def edge(im,y,xs,tag):
    px=im.load(); print(f"  [{tag}] y={y}: "+" ".join(f"{x}:{px[x,y]}" for x in xs))
edge(K,1400,range(34,46),'canon bord gauche')
edge(K,1770,range(500,512),'canon bord bas (y=1770)')
edge(K,1779,range(500,512),'canon bord bas (y=1779)')
for y in range(1775,1786): edge(K,y,[560],'canon bas colonne x=560')
print()
for y in range(1640,1660): edge(C,y,[560],'c19 bas colonne x=560')
