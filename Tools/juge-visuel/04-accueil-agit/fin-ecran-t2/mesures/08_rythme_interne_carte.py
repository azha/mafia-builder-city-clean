#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""08 — RYTHME INTERNE de la carte papier : ou tombe chaque bande d'encre, en % de la HAUTEUR DE LA
CARTE (grandeur invariante d'echelle — la consigne interdit de comparer des px Y absolus).

Encre = pixel dont la luminance < 165 DANS l'interieur de la carte (bords ecartes de 18 px).
On imprime les bandes contigues d'encre (>= 3 lignes) avec leur etendue en x.

Contrôles :
  POSITIF — la carte sans tampon (cadre 7 / G05) doit montrer les MEMES bandes dans le meme ordre :
            losange+TACTIQUE, titre, trait, labels, pastilles, valeurs.
  NEGATIF — une bande de papier vierge (le quart haut de la carte sous TACTIQUE) doit rendre
            ZERO ligne d'encre ; si l'instrument y voit de l'encre, il mesure le degrade, pas le texte.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6

CARTES = {
    "cadre-6-apres-geste-executed.png": (112, 692, 689, 1448),
    "cadre-7-echec-1re-cible.png": (107, 809, 691, 1565),
    "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png": (104, 1062, 693, 1795),
    "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png": (100, 1127, 696, 1860),
    "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png": (99, 1236, 696, 1968),
}
SEUIL = 165
BORD = 18


def bandes(path):
    f = os.path.basename(path)
    im = Image.open(path)
    px = im.convert("RGB").load()
    x0, y0, x1, y1 = CARTES[f]
    h = y1 - y0 + 1
    w = x1 - x0 + 1
    print("=== %s  %s   carte l=%d h=%d (%.1f x %.1f CSS)" % (f, im.size, w, h, w / ECH, h / ECH))
    lignes = []
    for y in range(y0 + BORD, y1 - BORD + 1):
        xs = []
        for x in range(x0 + BORD, x1 - BORD + 1):
            r, g, b = px[x, y]
            if (0.299 * r + 0.587 * g + 0.114 * b) < SEUIL:
                xs.append(x)
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
            if cur is not None and cur[1] - cur[0] >= 2:
                bs.append(cur)
            cur = None
    if cur is not None and cur[1] - cur[0] >= 2:
        bs.append(cur)
    for b in bs:
        print("    bande y=[%4d..%4d]  h=%3d px (%.1f CSS)  = [%5.1f%% .. %5.1f%%] de la carte   x=[%4d..%4d] (l=%d px)  max px/ligne=%d" %
              (b[0], b[1], b[1] - b[0] + 1, (b[1] - b[0] + 1) / ECH,
               100.0 * (b[0] - y0) / h, 100.0 * (b[1] - y0) / h, b[2], b[3], b[3] - b[2] + 1, b[4]))
    print()


for f in ["cadre-7-echec-1re-cible.png", "cadre-6-apres-geste-executed.png"]:
    bandes(os.path.join(REF, f))
for f in ["G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png",
          "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png",
          "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png"]:
    bandes(os.path.join(CAP, f))
