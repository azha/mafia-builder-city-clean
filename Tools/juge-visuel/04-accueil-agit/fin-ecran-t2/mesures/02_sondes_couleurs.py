#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""02 — sondes de couleur : mediane d'une fenetre 9x9 en des points choisis a la main,
a >= 3 px de tout bord. Sert a CALIBRER les detecteurs des scripts suivants.
Contrôle positif : le vert du panneau de la reference cadre 6 et celui du cadre 7 doivent etre
identiques (meme token CSS, meme rendu) ; le papier des deux aussi.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")


def med(im, cx, cy, r=4):
    px = im.convert("RGB").load()
    vals = [[], [], []]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            p = px[x, y]
            for c in range(3):
                vals[c].append(p[c])
    out = []
    for c in range(3):
        v = sorted(vals[c])
        out.append(v[len(v) // 2])
    return tuple(out)


def show(path, pts):
    im = Image.open(path)
    print("--- %s  %s" % (os.path.basename(path), im.size))
    for nom, (x, y) in pts:
        print("    %-34s (%4d,%4d) -> %s" % (nom, x, y, med(im, x, y)))


show(os.path.join(REF, "cadre-6-apres-geste-executed.png"), [
    ("vert panneau (gauche, haut)", (60, 700)),
    ("vert panneau (droite, milieu)", (1000, 1200)),
    ("vert panneau (centre bas)", (540, 1700)),
    ("papier carte (haut gauche)", (300, 750)),
    ("papier carte (bas droite)", (600, 1380)),
    ("fond hors panneau (ciel)", (540, 300)),
])

show(os.path.join(REF, "cadre-7-echec-1re-cible.png"), [
    ("vert panneau (gauche, haut)", (60, 820)),
    ("vert panneau (droite, milieu)", (1000, 1300)),
    ("papier carte (haut gauche)", (300, 950)),
    ("papier carte (bas droite)", (600, 1480)),
])

show(os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), [
    ("vert panneau (gauche, haut)", (40, 1000)),
    ("vert panneau (droite, milieu)", (1000, 1400)),
    ("vert panneau (centre bas)", (540, 2050)),
    ("papier carte (haut gauche)", (200, 1150)),
    ("papier carte (bas droite)", (650, 1700)),
    ("fond hors panneau (ciel)", (540, 300)),
])

show(os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png"), [
    ("vert panneau (gauche, haut)", (40, 1100)),
    ("papier carte (haut gauche)", (200, 1300)),
    ("papier carte (bas droite)", (650, 1700)),
])
