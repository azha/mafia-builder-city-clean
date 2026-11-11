#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m17 — le PANNEAU de la carte de tête (cadre 5 / H01) : gouttière, padding du titre,
largeur des deux gestes. Tout en px CSS (/3,6) et en % de la largeur d'écran.

Le panneau est plus clair que le décor autour sur ses bords : on le repère par la
DISCONTINUITÉ de luminance le long d'une rangée traversant les boutons, puis on vérifie
sur 3 rangées.

Contrôle positif : la largeur d'écran (1080 px) est la même des deux côtés ; la largeur
du bouton or, mesurée indépendamment par son aplat (r>=190,g>=140,b<=140), sert de
deuxième repère et doit tomber dans le panneau.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
C5 = os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")
CSS = 3.6


def ouvre(c):
    im = Image.open(c).convert("RGB")
    print("  [lu] %-46s %dx%d" % (os.path.basename(c), im.width, im.height))
    return im


def bouton_or(im, y0, y1):
    px = im.load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(0, im.width):
            r, g, b = px[x, y]
            if r >= 190 and g >= 140 and b <= 150 and r - b >= 60:
                xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys)) if xs else None


def panneau(im, y_test):
    """bords gauche/droit du panneau sur une rangee : saut de luminance > 8 depuis le bord."""
    px = im.load()
    w = im.width
    ligne = [sum(px[x, y_test]) / 3.0 for x in range(w)]
    g = None; d = None
    for x in range(0, w // 2):
        if ligne[x] - min(ligne[max(0, x - 12):x + 1]) > 6 and ligne[x] > 20:
            g = x; break
    for x in range(w - 1, w // 2, -1):
        if ligne[x] - min(ligne[x:min(w, x + 13)]) > 6 and ligne[x] > 20:
            d = x; break
    return g, d


print("=== PANNEAU DE LA CARTE DE TETE ===")
for nom, c, ytest, bt in [("REF cadre-5", C5, 1180, (1130, 1290)), ("CAP H01", H01, 1640, (1570, 1710))]:
    im = ouvre(c)
    g, d = panneau(im, ytest)
    print("      %-12s bords du panneau sur y=%d : x=%s .. %s | largeur=%s px = %s CSS | gouttiere gauche=%s CSS"
          % (nom, ytest, g, d, (d - g + 1) if g and d else "?",
             "%.1f" % ((d - g + 1) / CSS) if g and d else "?", "%.1f" % (g / CSS) if g else "?"))
    b = bouton_or(im, bt[0], bt[1])
    if b:
        print("                   bouton or : x %d..%d y %d..%d | L=%d px = %.1f CSS | H=%d px = %.1f CSS"
              % (b[0], b[2], b[1], b[3], b[2] - b[0] + 1, (b[2] - b[0] + 1) / CSS, b[3] - b[1] + 1, (b[3] - b[1] + 1) / CSS))
        if g and d:
            print("                   marge bouton<->bord gauche du panneau = %d px = %.1f CSS" % (b[0] - g, (b[0] - g) / CSS))

print("\n=== PADDING HAUT : haut du panneau -> haut du titre ===")
# haut du panneau : premiere rangee ou les deux bords existent
for nom, c, titre_y0 in [("REF cadre-5", C5, 846), ("CAP H01", H01, 1341)]:
    im = ouvre(c); px = im.load()
    haut = None
    for y in range(600 if nom.startswith("REF") else 900, im.height):
        g, d = panneau(im, y)
        if g and d and d - g > 800:
            haut = y; break
    print("      %-12s haut du panneau y=%s | haut de l'encre du titre y=%d | padding=%s px = %s CSS"
          % (nom, haut, titre_y0, (titre_y0 - haut) if haut else "?",
             "%.1f" % ((titre_y0 - haut) / CSS) if haut else "?"))
