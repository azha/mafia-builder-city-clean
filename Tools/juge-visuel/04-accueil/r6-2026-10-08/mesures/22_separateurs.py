#!/usr/bin/env python3
"""22 — separateurs de rangee de « la suite » (.r4{border-top:1px solid #ffffff12})
et retrait gauche du texte dans la carte de file (verification de tolerance).

CONTROLE POSITIF : les deux separateurs d'une meme plaque doivent se mesurer pareil.
CONTROLE NEGATIF : la meme mesure 20 px plus bas (dans l'aplat) doit rendre « aucun trait ».
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre

def trait(im, xc, y0, y1):
    px = im.load()
    prof = [(y, luminance_simple(px[xc, y])) for y in range(y0, y1)]
    base = sorted(v for _, v in prof)[len(prof)//4]
    lignes = [(y, v) for y, v in prof if v > base + 3]
    return base, lignes

CAS = [("ref4", 540, (925, 942)), ("ref4", 540, (1185, 1202)),
       ("c24", 540, (1160, 1177)), ("c24", 540, (1408, 1425)),
       ("c19", 540, (1048, 1065)), ("l19", 540, (1048, 1065))]
print("=== 22 — separateurs de rangee ===")
for cle, xc, (a, b) in CAS:
    im = ouvrir(cle, bavard=False)
    base, l = trait(im, xc, a, b)
    print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} y[{a},{b}] aplat L={base:.1f} : "
          f"{len(l)} ligne(s) au-dessus -> {[(y, round(v,1)) for y, v in l]}"
          f"   epaisseur = {len(l)}px ({css(len(l)):.2f} CSS)")
print()
print("   CONTROLE NEGATIF : meme mesure 40 px plus bas (dans l'aplat)")
for cle, xc, a in (("ref4", 540, 965), ("c24", 540, 1200)):
    im = ouvrir(cle, bavard=False)
    base, l = trait(im, xc, a, a+17)
    print(f"      {cle} y[{a},{a+17}] : {len(l)} ligne(s) -> {'OK (0)' if len(l)==0 else l}")
