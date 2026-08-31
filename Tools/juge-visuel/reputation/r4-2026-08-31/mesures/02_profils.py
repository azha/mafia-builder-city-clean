#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1/2 — profils de luminance le long d'une colonne et d'une ligne, pour
localiser les liserés de plaque (qui ne sont PAS dorés : la détection dorée du
script 01 les rate).

Usage : python3 02_profils.py            -> imprime les sauts détectés
CONTRÔLE POSITIF : sur la colonne choisie, le liseré doré du panneau racine
(déjà localisé par 01) doit ressortir comme saut ; on le vérifie en le citant.
CONTRÔLE NÉGATIF : sur une colonne prise dans le fond hors panneau (x=6),
aucun saut > seuil ne doit apparaître dans la même plage y.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, cx, cy, r=2):
    px = im.load()
    vals = [px[x, y] for x in range(cx - r, cx + r + 1) for y in range(cy - r, cy + r + 1)]
    vals.sort(key=lum)
    return vals[len(vals) // 2]


def sauts_colonne(im, x, y0, y1, seuil=6):
    px = im.load()
    out = []
    prev = lum(px[x, y0])
    for y in range(y0 + 1, y1):
        cur = lum(px[x, y])
        if abs(cur - prev) >= seuil:
            out.append((y, round(prev, 1), round(cur, 1), px[x, y]))
        prev = cur
    return out


def sauts_ligne(im, y, x0, x1, seuil=6):
    px = im.load()
    out = []
    prev = lum(px[x0, y])
    for x in range(x0 + 1, x1):
        cur = lum(px[x, y])
        if abs(cur - prev) >= seuil:
            out.append((x, round(prev, 1), round(cur, 1), px[x, y]))
        prev = cur
    return out


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}")
    print(f"CAP {CAP} {cap.size}")

    print("\n--- REF : colonne x=60 (dans le panneau racine, à gauche du contenu), y 370..1752")
    for s in sauts_colonne(ref, 60, 370, 1751):
        print("   ", s)
    print("\n--- CAP : colonne x=40 (dans le panneau racine, à gauche du contenu), y 10..1919")
    for s in sauts_colonne(cap, 40, 10, 1919):
        print("   ", s)

    print("\n[ctrl négatif] REF colonne x=6 (hors panneau) y 370..1740 :",
          len(sauts_colonne(ref, 6, 370, 1740)), "sauts (attendu ~0)")
    print("[ctrl négatif] CAP colonne x=6 (hors panneau) y 10..1900 :",
          len(sauts_colonne(cap, 6, 10, 1900)), "sauts (attendu ~0)")


main()
