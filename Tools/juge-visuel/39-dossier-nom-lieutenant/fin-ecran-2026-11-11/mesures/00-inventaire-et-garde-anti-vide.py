#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 0 — inventaire des fichiers du dossier + garde anti-vide (>= 5 % de pixels non noirs).
Contrôle positif : la largeur de TOUTES les images doit valoir 1080 px (posé par dossier.md).
Contrôle négatif : la hauteur des références (2102) DOIT differer de celle des captures (1920/2400).
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"

def nonnoir(im, seuil=12):
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    n = 0
    tot = 0
    # echantillonnage 1 px sur 4 en x et en y (270*h/4 points) — suffisant pour un taux
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            tot += 1
            if r > seuil or g > seuil or b > seuil:
                n += 1
    return 100.0 * n / tot

print("=== REFERENCES ===")
larg = set()
haut_ref = set()
for f in sorted(os.listdir(f"{D}/reference")):
    im = Image.open(f"{D}/reference/{f}")
    larg.add(im.size[0])
    haut_ref.add(im.size[1])
    print(f"{f:20s} taille={im.size} mode={im.mode} non-noir={nonnoir(im):5.1f}%")

print("=== CAPTURES ===")
haut_cap = set()
for f in sorted(os.listdir(f"{D}/captures")):
    im = Image.open(f"{D}/captures/{f}")
    larg.add(im.size[0])
    haut_cap.add(im.size[1])
    t = nonnoir(im)
    print(f"{f:40s} taille={im.size} mode={im.mode} non-noir={t:5.1f}%  garde={'OK' if t>=5 else 'ECHEC'}")

print()
print(f"CONTROLE POSITIF  largeurs distinctes = {sorted(larg)}  attendu [1080] -> {'OK' if larg=={1080} else 'ECHEC'}")
print(f"CONTROLE NEGATIF  hauteurs ref={sorted(haut_ref)} cap={sorted(haut_cap)} disjointes -> {'OK' if not (haut_ref & haut_cap) else 'ECHEC'}")
