#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m12 — les APLATS : papier de la carte, feutre vert, panneau de nuit, or.
Médiane d'une fenêtre entièrement intérieure à l'aplat (>= 3 px de tout bord), jamais un
pixel isolé. Le feutre a un dégradé radial : on l'échantillonne en 3 points homologues
(centre du panneau, bord gauche, bas) exprimés en FRACTION du panneau, pas en px.

Contrôle positif : l'or du mot-or, échantillonné des deux côtés, doit être identique
(même jeton de couleur recopié) — il sort (242,201,106) vs (242,201,107) dans m11.
Contrôle négatif : deux fenêtres du MÊME aplat dans la MÊME image doivent donner la même
médiane à moins de 3/255 — sinon la fenêtre n'est pas dans un aplat.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
REF = os.path.join(RACINE, "reference")
CAP = os.path.join(RACINE, "captures")


def med(chemin, box, nom, im_cache={}):
    if chemin not in im_cache:
        im = Image.open(chemin).convert("RGB")
        im_cache[chemin] = im
        print("  [lu] %s  %dx%d" % (os.path.basename(chemin), im.width, im.height))
    im = im_cache[chemin]
    px = im.load()
    vals = [[], [], []]
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            p = px[x, y]
            for i in range(3):
                vals[i].append(p[i])
    m = tuple(sorted(v)[len(v) // 2] for v in vals)
    print("      %-46s fenetre=%s -> RGB median = %s" % (nom, box, m))
    return m


print("=== PAPIER DE LA CARTE (zone vide, sous TACTIQUE) ===")
a = med(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (200, 900, 520, 980), "REF cadre-7 papier")
a2 = med(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (250, 1230, 560, 1290), "REF cadre-7 papier (2e fenetre, ctrl -)")
b = med(os.path.join(REF, "cadre-6-apres-geste-executed.png"), (200, 780, 520, 860), "REF cadre-6 papier")
c = med(os.path.join(CAP, "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), (200, 1250, 520, 1330), "CAP G02 papier")
c2 = med(os.path.join(CAP, "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), (250, 1600, 560, 1650), "CAP G02 papier (2e fenetre, ctrl -)")
d = med(os.path.join(CAP, "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), (200, 1150, 520, 1230), "CAP G01 papier")
print("      DELTA papier REF cadre-7 %s -> CAP G02 %s = (%+d, %+d, %+d)"
      % (a, c, c[0] - a[0], c[1] - a[1], c[2] - a[2]))
print("      [ctrl -] REF 2 fenetres : %s vs %s | CAP 2 fenetres : %s vs %s" % (a, a2, c, c2))

print("\n=== FEUTRE VERT (3 points homologues, en fraction du panneau) ===")
# panneau REF cadre-6 : y 542..1861 ; CAP G02 : y 1022..2177 (m04)
for nom, chemin, py0, py1 in [("REF cadre-6", os.path.join(REF, "cadre-6-apres-geste-executed.png"), 542, 1861),
                              ("CAP G02", os.path.join(CAP, "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), 1022, 2177)]:
    H = py1 - py0
    for etq, fx, fy in [("bord gauche 0,03/0,55", 0.03, 0.55), ("droite 0,90/0,25", 0.90, 0.25), ("bas 0,50/0,93", 0.50, 0.93)]:
        x = int(fx * 1080); y = py0 + int(fy * H)
        med(chemin, (x - 12, y - 12, x + 12, y + 12), "%s %s" % (nom, etq))

print("\n=== PANNEAU DE NUIT (carte de tete, cadre 5 / H01) ===")
e = med(os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), (520, 1160, 600, 1210), "REF cadre-5 fond du panneau")
f = med(os.path.join(CAP, "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png"), (520, 1560, 600, 1600), "CAP H01 fond du panneau")
print("      DELTA panneau nuit = (%+d, %+d, %+d)" % (f[0] - e[0], f[1] - e[1], f[2] - e[2]))

print("\n=== BOUTON OR (aplat du bouton primaire) ===")
g = med(os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), (140, 1200, 200, 1230), "REF bouton or")
h = med(os.path.join(CAP, "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png"), (120, 1700, 180, 1730), "CAP bouton or")
print("      DELTA bouton or = (%+d, %+d, %+d)" % (h[0] - g[0], h[1] - g[1], h[2] - g[2]))

print("\n=== CONTRASTE DES PETITS TEXTES DE LA CARTE, cote MAQUETTE (homologues de m11) ===")
import math


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def L(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def ratio(p, q):
    a, b = L(p), L(q)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def encre(chemin, box, nom, im_cache={}):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    pts = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(L(p) for p in pts)
    fond = [p for p in pts if L(p) >= lums[int(0.40 * len(lums))]]
    enc = [p for p in pts if L(p) <= lums[int(0.06 * len(lums))]]
    mf = tuple(sorted(p[i] for p in fond)[len(fond) // 2] for i in range(3))
    me = tuple(sorted(p[i] for p in enc)[len(enc) // 2] for i in range(3))
    print("      %-40s %s %dx%d fenetre=%s fond=%s encre=%s CONTRASTE=%5.2f:1"
          % (nom, os.path.basename(chemin)[:26], im.width, im.height, box, mf, me, ratio(me, mf)))
    return ratio(me, mf)


r1 = encre(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (140, 1420, 270, 1450), "REF « PORTEE »")
r2 = encre(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (130, 1470, 280, 1510), "REF « moderee »")
r3 = encre(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (105, 845, 250, 875), "REF « TACTIQUE »")
print("      (jeu, m11 : PORTEE 3,90:1 | majeure 4,45:1 | TACTIQUE 4,45:1)")
