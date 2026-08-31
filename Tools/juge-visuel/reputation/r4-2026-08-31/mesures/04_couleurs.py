#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1/2/3 — couleurs d'aplat : MÉDIANE d'une fenêtre 7x7 prise à >=3 px de
tout bord, sur des points homologues nommés à la main dans chaque image.

CONTRÔLE POSITIF : l'or du liseré du panneau racine — grandeur qu'on sait
égale (même token DA) — doit sortir identique à <=6/255 par canal.
CONTRÔLE NÉGATIF : le fond intérieur du grand panneau du portrait, dont on
VOIT qu'il diffère ; si l'instrument le donnait égal, il ne discriminerait pas.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def median(im, cx, cy, r=3):
    px = im.load()
    v = [px[x, y] for x in range(cx - r, cx + r + 1) for y in range(cy - r, cy + r + 1)]
    v.sort(key=lum)
    return v[len(v) // 2]


# nom : (point réf, point capture)
POINTS = [
    ("liseré or du panneau racine  [CTRL POSITIF]", (19, 1000), (19, 900)),
    ("fond hors panneau, haut-gauche",              (8, 500),   (8, 120)),
    ("fond hors panneau, bas-gauche",               (8, 1700),  (8, 1870)),
    ("fond hors panneau, bas-centre",               (450, 1745),(540, 1912)),
    ("fond intérieur du panneau racine (gouttière)",(30, 640),  (30, 300)),
    ("fond de la plaque du titre",                  (100, 430), (100, 100)),
    ("fond d'une tuile compteur (RÈGLES DONNÉES)",  (100, 620), (100, 300)),
    ("liseré d'une tuile compteur",                 (58, 630),  (52, 310)),
    ("fond du GRAND panneau portrait [CTRL NÉGATIF]",(45, 1000), (40, 900)),
    ("fond intérieur de la carte portrait",         (110, 800), (110, 500)),
    ("fond d'une tuile voyant (manches basses)",    (700, 975), (850, 690)),
    ("fond du vide sous la carte portrait",         (250, 1310),(250, 1250)),
    ("fond de la plaque du verdict",                (450, 1420),(540, 1430)),
    ("visage du lieutenant",                        (245, 960), (272, 660)),
    ("buste (veste) du lieutenant",                 (180, 1130),(210, 880)),
    ("triangle du col",                             (247, 1090),(272, 855)),
    ("cravate / plastron",                          (247, 1050),(272, 800)),
]


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}")
    print(f"CAP {CAP} {cap.size}")
    print(f"{'grandeur':46s} {'réf':>16s} {'jeu':>16s} {'Δ max/canal':>12s}")
    for name, pr, pc in POINTS:
        a = median(ref, *pr)
        b = median(cap, *pc)
        d = max(abs(a[i] - b[i]) for i in range(3))
        flag = "ÉGAL" if d <= 6 else "ÉCART"
        print(f"{name:46s} {str(a):>16s} {str(b):>16s} {d:>8}  {flag}")


main()
