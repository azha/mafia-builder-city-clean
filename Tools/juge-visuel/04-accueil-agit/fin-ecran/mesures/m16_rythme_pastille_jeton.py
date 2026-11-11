#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m16 — rythme interne de la carte, pastille « DÉJÀ TRANCHÉE », jeton, filet de séparation.

Tout est exprimé en FRACTION de la hauteur de carte (invariant d'échelle), jamais en px Y.
Contrôle positif : la position du filet de séparation (le trait au-dessus de PORTÉE) doit
tomber à la même fraction des deux côtés si la carte a le même gabarit.
Contrôle négatif : la même recherche de filet dans le TIERS HAUT de la carte (où il n'y en
a pas) ne doit rien trouver.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
REF = os.path.join(RACINE, "reference")
CAP = os.path.join(RACINE, "captures")
C7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G02 = os.path.join(CAP, "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png")
G03 = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_cb56d837e_b35bdd6cb_1080x2400.png")

CARTES = {"REF cadre-7": (C7, 106, 678, 806, 1571), "CAP G02": (G02, 100, 683, 1142, 1906)}


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Lw(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def ouvre(c, cache={}):
    if c not in cache:
        im = Image.open(c).convert("RGB")
        cache[c] = im
        print("  [lu] %-46s %dx%d" % (os.path.basename(c), im.width, im.height))
    return cache[c]


print("=== TITRE : ou tombe-t-il dans la carte ? (fraction de la hauteur de carte) ===")
for nom, (c, xa, xb, y0, y1) in CARTES.items():
    px = ouvre(c).load()
    H = y1 - y0 + 1
    lignes = []
    for y in range(y0 + int(0.15 * H), y0 + int(0.80 * H)):
        vals = sorted(Lw(px[x, y]) for x in range(xa, xb))
        fond = vals[int(0.85 * len(vals))]
        n = sum(1 for v in vals if v < fond * 0.45)
        lignes.append((y, n))
    nz = [y for y, n in lignes if n >= 8]
    if nz:
        print("      %-12s titre : y %d..%d  -> fraction %.3f .. %.3f de la carte (H=%d)"
              % (nom, nz[0], nz[-1], (nz[0] - y0) / float(H), (nz[-1] - y0) / float(H), H))
        print("                   hauteur du bloc titre = %.3f de la carte" % ((nz[-1] - nz[0] + 1) / float(H)))

print("\n=== FILET DE SEPARATION au-dessus de PORTEE ===")
for nom, (c, xa, xb, y0, y1) in CARTES.items():
    px = ouvre(c).load()
    H = y1 - y0 + 1
    trouve = []
    for y in range(y0 + int(0.60 * H), y0 + int(0.95 * H)):
        vals = [px[x, y] for x in range(xa + 20, xb - 20)]
        fond = sorted(Lw(p) for p in vals)[int(0.85 * len(vals))]
        n = sum(1 for p in vals if Lw(p) < fond * 0.80)
        if n > 0.80 * len(vals):
            trouve.append((y, n, tuple(sorted(p[i] for p in vals)[len(vals) // 2] for i in range(3))))
    if trouve:
        y, n, col = trouve[0]
        print("      %-12s filet a y=%d -> fraction %.3f | couleur mediane du filet = %s | epaisseur = %d px"
              % (nom, y, (y - y0) / float(H), col, len(trouve)))
    else:
        print("      %-12s aucun filet trouve" % nom)
    # controle negatif : tiers haut
    neg = []
    for y in range(y0 + int(0.05 * H), y0 + int(0.30 * H)):
        vals = [px[x, y] for x in range(xa + 20, xb - 20)]
        fond = sorted(Lw(p) for p in vals)[int(0.85 * len(vals))]
        if sum(1 for p in vals if Lw(p) < fond * 0.80) > 0.80 * len(vals):
            neg.append(y)
    print("                   [ctrl -] filets trouves dans le tiers haut : %d (attendu 0)" % len(neg))

print("\n=== PASTILLE « DEJA TRANCHEE » (G03) : contraste et encombrement ===")
px = ouvre(G03).load()
box = (120, 1930, 580, 1975)
ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
lums = sorted(Lw(p) for p in ps)
fond = [p for p in ps if Lw(p) >= lums[int(0.40 * len(lums))]]
enc = [p for p in ps if Lw(p) <= lums[int(0.06 * len(lums))]]
mf = tuple(sorted(p[i] for p in fond)[len(fond) // 2] for i in range(3))
me = tuple(sorted(p[i] for p in enc)[len(enc) // 2] for i in range(3))
a, b = Lw(me), Lw(mf)
if a < b:
    a, b = b, a
print("      fenetre=%s fond=%s encre=%s -> contraste %.2f:1 %s"
      % (box, mf, me, (a + 0.05) / (b + 0.05), "" if (a + 0.05) / (b + 0.05) >= 4.5 else " << SOUS 4,5:1"))

print("\n=== JETON : diametre (px image puis px CSS) ===")
def disque_or(c, box, nom):
    px = ouvre(c).load()
    xs, ys = [], []
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b2 = px[x, y]
            if r >= 180 and g >= 140 and b2 <= 160 and r - b2 >= 50:
                xs.append(x); ys.append(y)
    if xs:
        print("      %-18s bbox x %d..%d y %d..%d -> diametre %d x %d px = %.1f x %.1f CSS"
              % (nom, min(xs), max(xs), min(ys), max(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1,
                 (max(xs) - min(xs) + 1) / 3.6, (max(ys) - min(ys) + 1) / 3.6))
disque_or(os.path.join(REF, "cadre-6-apres-geste-executed.png"), (780, 1130, 980, 1320), "REF jeton")
disque_or(G02, (780, 1440, 1000, 1640), "CAP jeton")
