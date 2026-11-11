#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""29 — MESURE DEFINITIVE de la couture des deux options (remplace les chiffres de 19/20/21, dont
la fenetre en Y COUPAIT la 1re ligne du bloc de consequence en 2400 : elle donnait 514 px au lieu
de 552 px, et une gouttiere de 55 px au lieu de 36 px).

Protocole : fenetre Y GENEREUSE, lignes d'abord imprimees une par une (on voit ainsi qu'aucune
n'est tronquee en haut ni en bas), puis colonnes separees par un trou >= 30 px.

Contrôles :
  POSITIF — la mesure doit etre IDENTIQUE en 1080x2400 et en 1080x1920 (meme mise en page).
  NEGATIF — la meme separation appliquee a la rangee des BOUTONS doit rendre 2 blocs eux aussi,
            mais a une autre abscisse : c'est tout le propos de la mesure.
  STABILITE — refaite aux seuils 55, 95 et 130.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def lignes(path, nom, y0, y1, s=95):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("  --- %s  [%s %s]  fenetre y=[%d..%d]" % (nom, os.path.basename(path)[:26], im.size, y0, y1))
    prev = 0
    bloc = None
    for y in range(y0, y1):
        xs = [x for x in range(40, 1040) if lum(px[x, y]) > s]
        n = len(xs)
        if n > 0 and prev == 0:
            bloc = [y, y, min(xs), max(xs)]
        elif n > 0:
            bloc[1] = y
            bloc[2] = min(bloc[2], min(xs))
            bloc[3] = max(bloc[3], max(xs))
        elif n == 0 and prev > 0:
            if bloc[1] - bloc[0] >= 3:
                touche = "  !! TRONQUEE" if (bloc[0] <= y0 or bloc[1] >= y1 - 1) else ""
                print("      ligne y=[%4d..%4d] x=[%4d..%4d] l=%3d%s" %
                      (bloc[0], bloc[1], bloc[2], bloc[3], bloc[3] - bloc[2] + 1, touche))
            bloc = None
        prev = n


def split(path, nom, y0, y1, s=95, trou=30):
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = set(x for x in range(40, 1040) if any(lum(px[x, y]) > s for y in range(y0, y1)))
    bs = []
    cur = None
    v = 0
    for x in range(40, 1040):
        if x in cols:
            cur = [x, x] if cur is None else [cur[0], x]
            v = 0
        else:
            if cur is not None:
                v += 1
                if v >= trou:
                    bs.append(cur)
                    cur = None
    if cur:
        bs.append(cur)
    bs = [b for b in bs if b[1] - b[0] >= 40]
    txt = "  ".join("x=[%d..%d] l=%d (%.2f CSS)" % (b[0], b[1], b[1] - b[0] + 1, (b[1] - b[0] + 1) / ECH) for b in bs)
    print("      seuil %3d : %d bloc(s)  %s" % (s, len(bs), txt))
    if len(bs) == 2:
        a, b = bs[0][1] + 1, bs[1][0] - 1
        print("                  GOUTTIERE x=[%d..%d] l=%d px (%.2f CSS)  CENTRE=%.1f" %
              (a, b, b - a + 1, (b - a + 1) / ECH, (a + b) / 2.0))
        return (a + b) / 2.0
    return None


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
H24 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H19 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> ETAGE DES CONSEQUENCES")
lignes(R5, "reference cadre 5", 1285, 1470)
cr = [split(R5, "ref", 1285, 1470, s=s) for s in (55, 95, 130)]
lignes(H24, "capture H01 2400", 1710, 1900)
c24 = [split(H24, "H01 2400", 1710, 1900, s=s) for s in (55, 95, 130)]
lignes(H19, "capture H01 1920", 1230, 1420)
c19 = [split(H19, "H01 1920", 1230, 1420, s=s) for s in (55, 95, 130)]

print()
print(">>> ETAGE DES BOUTONS (seuil bas : le bouton secondaire n'est qu'un contour)")
br = split(R5, "ref", 1141, 1276, s=60, trou=20)
b24 = split(H24, "H01 2400", 1574, 1702, s=60, trou=20)
b19 = split(H19, "H01 1920", 1094, 1222, s=60, trou=20)

print()
print(">>> DECALAGE DES DEUX COUTURES")
for nom, b, c in (("reference cadre 5", br, cr[1]), ("capture H01 2400", b24, c24[1]), ("capture H01 1920", b19, c19[1])):
    if b is None or c is None:
        print("    %-20s : une des deux coutures n'a pas ete isolee" % nom)
        continue
    d = c - b
    print("    %-20s couture boutons=%6.1f  couture consequences=%6.1f  DECALAGE=%+7.1f px (%+6.2f CSS, %+5.2f %% de la largeur d'ecran)" %
          (nom, b, c, d, d / ECH, 100.0 * d / 1080))
