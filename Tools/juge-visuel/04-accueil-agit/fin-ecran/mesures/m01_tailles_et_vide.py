#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m01 — taille de CHAQUE image lue + garde anti-vide (% de pixels non noirs).
Contrôle positif : une image entièrement noire fabriquee ici doit donner 0,0 % ;
contrôle négatif : une image entièrement blanche doit donner 100,0 %.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
REF = os.path.join(RACINE, "reference")
CAP = os.path.join(RACINE, "captures")


def pct_non_noir(im, seuil=16):
    im = im.convert("RGB")
    petit = im.resize((im.width // 4, im.height // 4), Image.BILINEAR)
    n = 0
    tot = petit.width * petit.height
    for r, g, b in petit.getdata():
        if r > seuil or g > seuil or b > seuil:
            n += 1
    return 100.0 * n / tot


def ligne(chemin):
    im = Image.open(chemin)
    print("%-62s  %sx%s  mode=%s  non-noir=%5.1f %%"
          % (os.path.basename(chemin), im.width, im.height, im.mode, pct_non_noir(im)))


print("=== CONTROLES ===")
noir = Image.new("RGB", (400, 400), (0, 0, 0))
blanc = Image.new("RGB", (400, 400), (255, 255, 255))
print("controle positif (image noire 400x400)  : non-noir=%5.1f %%" % pct_non_noir(noir))
print("controle negatif (image blanche 400x400): non-noir=%5.1f %%" % pct_non_noir(blanc))

print("\n=== REFERENCES ===")
for f in sorted(os.listdir(REF)):
    if f.endswith(".png"):
        ligne(os.path.join(REF, f))

print("\n=== CAPTURES ===")
for f in sorted(os.listdir(CAP)):
    if f.endswith(".png"):
        ligne(os.path.join(CAP, f))
