#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""14 — profil LIGNE PAR LIGNE du pied du panneau (mot-or, filets, ligne-or, sous-ligne) et de la
colonne du jeton. Pour chaque ligne : nombre de px clairs et etendue x. Sert a poser les fenetres
exactes des mesures suivantes — plusieurs fenetres de 13 etaient MORDUES (le filet-or et le texte
voisin entraient dedans).
Contrôle : les lignes de FILET (traits horizontaux) se reconnaissent a une etendue x quasi pleine
(> 800 px) sur 2 a 4 lignes ; le TEXTE a une etendue plus courte sur ~30 lignes.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
SEUIL = 120


def profil(path, nom, y0, y1, x0=20, x1=1060, seuil=SEUIL):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("--- %s  [%s %s]  y=[%d..%d]" % (nom, os.path.basename(path)[:30], im.size, y0, y1))
    prec = None
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1)
              if (0.299 * px[x, y][0] + 0.587 * px[x, y][1] + 0.114 * px[x, y][2]) > seuil]
        if xs:
            cur = (len(xs), min(xs), max(xs))
        else:
            cur = (0, -1, -1)
        marque = ""
        if cur[0] == 0 and prec is not None and prec[0] > 0:
            marque = "   <<< fin de bloc"
        if cur[0] > 0 and (prec is None or prec[0] == 0):
            marque = "   <<< debut de bloc"
        print("    y=%4d  n=%4d  x=[%4d..%4d]%s" % (y, cur[0], cur[1], cur[2], marque))
        prec = cur
    print()


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")

profil(R6, "ref cadre 6  pied", 1680, 1800)
profil(G01, "capture G01  pied", 2015, 2145)
profil(R6, "ref cadre 6  jeton/LIBRE", 1315, 1430, x0=760, x1=1010)
profil(G01, "capture G01  jeton/LIBRE", 1715, 1850, x0=760, x1=1010)
