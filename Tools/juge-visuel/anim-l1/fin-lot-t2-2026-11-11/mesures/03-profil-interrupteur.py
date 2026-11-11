#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""03 — profil horizontal de l'interrupteur « Dire mes prix au marche » (ligne Marche).

Imprime, sur la ligne médiane de la piste, la luminance de x=915 à x=1025, pour
situer piste, curseur et bords. Sert à poser les repères du script 04 (position du
curseur) et 05 (couleur de piste). Pas de verdict ici : c'est une lecture brute.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def profil(nom, y):
    im = Image.open(os.path.join(BASE, nom)).convert("RGB")
    print("ouvert %-56s taille=%dx%d  ligne y=%d" % (nom, im.size[0], im.size[1], y))
    p = im.load()
    ligne = []
    for x in range(910, 1030):
        r, g, b = p[x, y]
        ligne.append("%3d:%3d,%3d,%3d" % (x, r, g, b))
    for i in range(0, len(ligne), 6):
        print("   " + "  ".join(ligne[i:i+6]))
    print("")

for nom in ["bascule-course-marche-sens1_avant_1080x1920.png",
            "bascule-course-marche-sens1_t70ms_1080x1920.png",
            "bascule-course-marche-sens1_t140ms_1080x1920.png"]:
    profil(nom, 955)

# colonne verticale au centre de la piste, pour trouver le haut/bas
im = Image.open(os.path.join(BASE, "bascule-course-marche-sens1_avant_1080x1920.png")).convert("RGB")
print("colonne x=968 (taille=%dx%d)" % im.size)
p = im.load()
for y in range(925, 995):
    print("   y=%d  %s" % (y, p[968, y]))
