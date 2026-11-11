#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""05 — lecture BRUTE du bandeau : profil vertical hors texte et hors médaillon.

Colonne x=250 (dans l'emprise du bandeau, à gauche du médaillon et au-dessus/sous
le texte : on y voit le filet haut, le fond du bandeau, le filet bas).
Pas de verdict : ce script pose les repères du script 06.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

for n in ["bandeau-entree_t0_1080x1920.png", "bandeau-entree_t50ms_1080x1920.png",
          "bandeau-entree_t70ms_1080x1920.png", "bandeau-entree_t100ms_1080x1920.png",
          "bandeau-entree_t200ms_1080x1920.png"]:
    im = Image.open(os.path.join(BASE, n)).convert("RGB")
    print("== %s taille=%dx%d  colonne x=250" % (n, im.size[0], im.size[1]))
    p = im.load()
    for y in range(180, 300):
        print("   y=%3d %s" % (y, p[250, y]))
    print("")
