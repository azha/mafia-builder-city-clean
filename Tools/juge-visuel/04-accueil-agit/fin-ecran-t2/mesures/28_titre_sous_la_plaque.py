#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""28 — LISIBILITE DU TITRE SOUS LA PLAQUE DU TAMPON (point de vigilance 1 du dossier).
Dans la bande ou le titre passe SOUS la plaque translucide, on separe :
  - l'encre du TITRE   : pixels NEUTRES (|r-g| <= 22 et |g-b| <= 35) et sombres,
  - le fond de PLAQUE  : pixels neutres et clairs,
et on exclut l'encre ROUGE du tampon (r-g > 40). On rend le contraste WCAG du titre attenue.

Contrôles :
  POSITIF — hors plaque, le meme calcul doit rendre le titre PLEIN (encre quasi noire, ~12:1) ;
            c'est la valeur mesuree en 16 (12,8:1 ref / 12,6:1 capture).
  NEGATIF — une fenetre de plaque SANS titre dessous doit rendre un ratio ~1.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")


def srgb_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Lrel(p):
    return 0.2126 * srgb_lin(p[0]) + 0.7152 * srgb_lin(p[1]) + 0.0722 * srgb_lin(p[2])


def ratio(a, b):
    la, lb = Lrel(a), Lrel(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def mesure(path, nom, x0, x1, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    neutres = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            if (p[0] - p[1]) > 40:   # encre rouge du tampon : exclue
                continue
            if abs(p[0] - p[1]) <= 22 and abs(p[1] - p[2]) <= 35:
                neutres.append(p)
    if len(neutres) < 400:
        print("  %-42s trop peu de pixels neutres (%d)" % (nom, len(neutres)))
        return
    neutres.sort(key=Lrel)
    d = max(1, len(neutres) // 12)

    def medcol(l):
        return tuple(sorted(c[i] for c in l)[len(l) // 2] for i in range(3))
    e = medcol(neutres[:d])
    f = medcol(neutres[-d:])
    print("  %-42s titre=%-16s plaque=%-16s  contraste=%5.2f:1  (%d px)   [%s %s]" %
          (nom, str(e), str(f), ratio(e, f), len(neutres), os.path.basename(path)[:24], im.size))


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G06 = os.path.join(CAP, "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — plaque du tampon SANS titre dessous (partie basse-gauche du tampon)")
mesure(R6, "ref c6  plaque nue", 150, 320, 1130, 1200)
mesure(G01, "cap G01 plaque nue", 150, 300, 1480, 1540)

print()
print(">>> TITRE SOUS LA PLAQUE")
mesure(R6, "ref c6  titre sous plaque", 330, 660, 925, 1010)
mesure(G01, "cap G01 titre sous plaque", 330, 620, 1310, 1400)
mesure(G06, "cap G06 titre sous plaque", 330, 620, 1405, 1495)

print()
print(">>> CONTROLE POSITIF — titre HORS plaque (meme carte)")
mesure(R6, "ref c6  titre hors plaque", 160, 300, 920, 985)
mesure(G01, "cap G01 titre hors plaque", 180, 300, 1350, 1410)
