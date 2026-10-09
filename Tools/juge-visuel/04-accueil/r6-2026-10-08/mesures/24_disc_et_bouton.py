#!/usr/bin/env python3
"""24 — deux chiffres que je refuse de citer sans les avoir mesures :
la COULEUR de la pastille FAMILLE (.disc) de la reference, et la hauteur du
bouton or de rangee de « la suite » des deux cotes.

CONTROLE POSITIF : le bouton or de rangee doit avoir la MEME hauteur des deux cotes
(meme .g4 de la meme feuille) alors que sa largeur depend du libelle servi.
CONTROLE NEGATIF : la pastille cherchee 60 px a gauche (sur le rond EMPIRE) -> 0 px.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, mediane_fenetre

im = ouvrir("ref4")
px = im.load()
pts = [(x, y) for y in range(1880, 1915) for x in range(480, 525)
       if px[x, y][0] >= 120 and px[x, y][0]-px[x, y][2] >= 60]
xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
cx, cy = (min(xs)+max(xs))//2, (min(ys)+max(ys))//2
print(f"   REF4 .disc : x[{min(xs)},{max(xs)}] y[{min(ys)},{max(ys)}] "
      f"{max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}px ({css(max(xs)-min(xs)+1):.2f} CSS)  "
      f"COULEUR au centre = {mediane_fenetre(im, cx, cy, 1)}  ({len(pts)} px)")
pts2 = [(x, y) for y in range(1880, 1915) for x in range(290, 340)
        if px[x, y][0] >= 120 and px[x, y][0]-px[x, y][2] >= 60]
print(f"   CONTROLE NEGATIF meme masque 190 px a gauche : {len(pts2)} px -> {'OK' if not pts2 else 'BRUIT'}")

print()
print("   bouton OR de rangee de « la suite » (.g4.or) :")
for cle, x0, x1, y0, y1 in (("ref4", 600, 1010, 790, 905), ("c24", 600, 1010, 1025, 1140),
                            ("c19", 600, 1010, 655, 775)):
    im = ouvrir(cle)
    px = im.load()
    p = [(x, y) for y in range(y0, y1) for x in range(x0, x1)
         if px[x, y][0] >= 110 and px[x, y][0]-px[x, y][2] >= 45]
    xs = [q[0] for q in p]; ys = [q[1] for q in p]
    print(f"      {cle:5s} x[{min(xs)},{max(xs)}] y[{min(ys)},{max(ys)}] "
          f"{max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}px "
          f"-> HAUTEUR = {css(max(ys)-min(ys)+1):.2f} CSS (largeur = libelle servi)")
