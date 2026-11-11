#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""26 — RYTHME VERTICAL DU PIED du panneau : bas de la carte -> mot-or -> filet 1 -> ligne-or ->
sous-ligne -> filet 2 -> bas du panneau. On rend chaque bloc et l'ECART au precedent.

Pourquoi des px Y sont ici comparables alors que les images n'ont pas la meme hauteur : l'echelle
est 1:1 en X ET en Y, prouve par trois invariants mesures ailleurs — jeton 151 px de diametre
(ref) / 151 px (capture, mesure 17), hauteur de capitale du 'D' du titre 40 px / 40 px (mesure 10),
hauteur de capitale de RETOUR 25 px / 25 px (mesure 14). Ce sont des ECARTS LOCAUX, pas des
positions absolues.

Contrôles :
  POSITIF — le filet et la ligne-or doivent etre retrouves aux memes y qu'en 14 et 15.
  NEGATIF — au-dessus du bas de la carte, la recherche ne doit pas rendre de bloc « pied ».
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def blocs(path, nom, y0, y1, seuil=95, x0=25, x1=1055):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("=== %s  [%s %s]  y=[%d..%d]" % (nom, os.path.basename(path)[:28], im.size, y0, y1))
    lignes = []
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if lum(px[x, y]) > seuil]
        lignes.append((y, xs))
    bs = []
    cur = None
    for y, xs in lignes:
        if xs:
            if cur is None:
                cur = [y, y, min(xs), max(xs), len(xs)]
            else:
                cur[1] = y
                cur[2] = min(cur[2], min(xs))
                cur[3] = max(cur[3], max(xs))
                cur[4] = max(cur[4], len(xs))
        else:
            if cur is not None:
                bs.append(cur)
            cur = None
    if cur is not None:
        bs.append(cur)
    prev = None
    for b in bs:
        if b[1] - b[0] < 2:
            continue
        kind = "FILET" if (b[4] > 700 and b[1] - b[0] <= 5) else "texte"
        ec = ("   ecart = %3d px (%5.2f CSS)" % (b[0] - prev - 1, (b[0] - prev - 1) / ECH)) if prev is not None else ""
        print("    %-5s y=[%4d..%4d] h=%3d  x=[%4d..%4d] l=%4d px (%6.2f CSS)%s" %
              (kind, b[0], b[1], b[1] - b[0] + 1, b[2], b[3], b[3] - b[2] + 1, (b[3] - b[2] + 1) / ECH, ec))
        prev = b[1]
    print()


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — bande prise AU-DESSUS du pied (dans la carte)")
blocs(R6, "ref cadre 6 (dans la carte)", 1000, 1100)

print(">>> PIED — de la fin de la carte au bas du panneau")
# ref cadre 6 : carte finit a 1448, panneau finit a 1861
blocs(R6, "ref cadre 6", 1455, 1865)
# capture G01 : carte finit a 1795, panneau finit a 2169
blocs(G01, "capture G01", 1800, 2175)
# ref cadre 7 : carte finit a 1565, panneau 1861
blocs(R7, "ref cadre 7", 1570, 1865)
# capture G05 : carte finit a 1860, panneau 2172
blocs(G05, "capture G05", 1865, 2175)
