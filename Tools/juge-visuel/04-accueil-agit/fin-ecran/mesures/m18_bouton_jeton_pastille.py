#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m18 — trois grandeurs que m13/m16 avaient mal fenêtrées, remesurées proprement :
largeur du bouton or, diamètre du jeton, contraste de la pastille « DÉJÀ TRANCHÉE ».

Le bouton or est pris comme la PLUS LONGUE PLAGE or d'une rangée de la bande du bouton :
dans la maquette, le décor éclairé transparaît à travers le panneau translucide et pollue
un simple masque de couleur (c'est ce qui a faussé m17) — une plage contiguë, elle, ne
retient que le bouton.

Contrôle positif : le bouton or doit sortir à la même largeur des deux côtés (même
gabarit) et commencer au même x (103 vs 101).
Contrôle négatif : la même recherche dans une bande SANS bouton (au-dessus du titre) doit
rendre une plage courte (< 60 px).
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
C5 = os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png")
C6 = os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png")
H01 = os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")
G02 = os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png")
G03 = os.path.join(RACINE, "captures", "G03_ApresGeste_deja_tranchee_cb56d837e_b35bdd6cb_1080x2400.png")
CSS = 3.6


def ouvre(c, cache={}):
    if c not in cache:
        im = Image.open(c).convert("RGB")
        cache[c] = im
        print("  [lu] %-46s %dx%d" % (os.path.basename(c), im.width, im.height))
    return cache[c]


def plage_or(c, yband, nom):
    im = ouvre(c)
    px = im.load()
    best = (0, 0, 0, 0)
    for y in range(yband[0], yband[1]):
        cur = 0
        for x in range(im.width):
            r, g, b = px[x, y]
            if r >= 190 and g >= 140 and b <= 150 and r - b >= 60:
                cur += 1
            else:
                if cur > best[0]:
                    best = (cur, x - cur, x - 1, y)
                cur = 0
        if cur > best[0]:
            best = (cur, im.width - cur, im.width - 1, y)
    print("      %-30s plage or la plus longue = %4d px = %6.1f CSS  (x %d..%d, y=%d)"
          % (nom, best[0], best[0] / CSS, best[1], best[2], best[3]))
    return best


def disque_or(c, box, nom):
    im = ouvre(c)
    px = im.load()
    xs = []
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            r, g, b = px[x, y]
            if r >= 180 and g >= 140 and b <= 170 and r - b >= 45:
                xs.append(x)
    if xs:
        print("      %-30s largeur = %d px = %.1f CSS  (x %d..%d)"
              % (nom, max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / CSS, min(xs), max(xs)))


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def Lw(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def contraste(c, box, nom):
    im = ouvre(c)
    px = im.load()
    ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(Lw(p) for p in ps)
    fond = [p for p in ps if Lw(p) >= lums[int(0.40 * len(lums))]]
    enc = [p for p in ps if Lw(p) <= lums[int(0.06 * len(lums))]]
    mf = tuple(sorted(p[i] for p in fond)[len(fond) // 2] for i in range(3))
    me = tuple(sorted(p[i] for p in enc)[len(enc) // 2] for i in range(3))
    a, b = Lw(me), Lw(mf)
    if a < b:
        a, b = b, a
    r = (a + 0.05) / (b + 0.05)
    print("      %-30s fond=%s encre=%s -> %5.2f:1 %s" % (nom, mf, me, r, "" if r >= 4.5 else " << SOUS 4,5:1"))
    return r


print("=== BOUTON OR (largeur) ===")
plage_or(C5, (1140, 1280), "REF cadre-5")
plage_or(H01, (1570, 1710), "CAP H01")
print("  [controle negatif] meme recherche dans une bande SANS bouton :")
plage_or(C5, (960, 1010), "REF cadre-5, bande PORTEE")
plage_or(H01, (1420, 1470), "CAP H01, bande PORTEE")

print("\n=== JETON (diametre) ===")
disque_or(C6, (760, 1120, 1000, 1330), "REF cadre-6 jeton")
disque_or(G02, (790, 1640, 1010, 1830), "CAP G02 jeton")

print("\n=== PASTILLE « DEJA TRANCHEE » (G03) ===")
contraste(G03, (285, 1900, 535, 1935), "CAP G03 pastille")
