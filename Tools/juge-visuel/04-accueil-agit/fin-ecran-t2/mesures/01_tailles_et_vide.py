#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""01 — tailles de TOUTES les images du dossier + garde anti-vide (>= 5 % de pixels non noirs).
Contrôle positif : les 3 références doivent faire 1080x2102 (dossier.md), les captures 1080x2400/1920.
Contrôle négatif : un cadre 100 % noir fabriqué doit tomber a 0.0 % (l'instrument doit savoir dire « vide »).
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")


def part_non_noir(im, seuil=16):
    im = im.convert("RGB")
    n = 0
    tot = 0
    # echantillonnage 1 px sur 4 en x et en y (270 x N) — suffisant pour un % global
    px = im.load()
    w, h = im.size
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            tot += 1
            if r > seuil or g > seuil or b > seuil:
                n += 1
    return 100.0 * n / tot


print("=== REFERENCES ===")
for f in sorted(os.listdir(REF)):
    if not f.endswith(".png"):
        continue
    im = Image.open(os.path.join(REF, f))
    print("%-42s %s  mode=%s  non-noir=%.1f%%" % (f, im.size, im.mode, part_non_noir(im)))

print()
print("=== CAPTURES ===")
for f in sorted(os.listdir(CAP)):
    if not f.endswith(".png"):
        continue
    im = Image.open(os.path.join(CAP, f))
    print("%-62s %s  mode=%s  non-noir=%.1f%%" % (f, im.size, im.mode, part_non_noir(im)))

print()
print("=== CONTROLE NEGATIF (cadre noir fabrique 1080x2400) ===")
noir = Image.new("RGB", (1080, 2400), (0, 0, 0))
print("noir pur                      non-noir=%.1f%%  (doit etre 0.0)" % part_non_noir(noir))
gris = Image.new("RGB", (1080, 2400), (17, 17, 17))
print("gris 17 (juste au-dessus du seuil 16)  non-noir=%.1f%%  (doit etre 100.0)" % part_non_noir(gris))
