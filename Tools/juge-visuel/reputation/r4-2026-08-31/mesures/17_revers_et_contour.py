#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — les REVERS du veston et le CONTOUR du buste (deux des cinq traits
de portrait de l'angle mort A7).

Instrument : profil de luminance le long d'une rangée du buste (à 68 % et à
74 % de la hauteur de la carte), imprimé en clair. Un revers = un CREUX de
luminance à l'intérieur du demi-disque, de part et d'autre du plastron. Un
contour = un creux (ou une crête) aux DEUX extrémités du demi-disque.

CONTRÔLE POSITIF : le plastron/le col, au milieu de la rangée à 68 %, doit
sortir comme une crête très haute dans les DEUX images (on sait qu'il y est).
CONTRÔLE NÉGATIF : la même rangée prise 8 % plus bas que le bas du buste (dans
le fond de la carte) doit être plate.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CARTE = {"REF": (72, 735, 420, 1277), "JEU": (75, 439, 493, 1058)}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil(im, y, x0, x1, n=60):
    px = im.load()
    out = []
    for i in range(n):
        a = x0 + (x1 - x0) * i // n
        b = max(a + 1, x0 + (x1 - x0) * (i + 1) // n)
        v = sorted(lum(px[x, y]) for x in range(a, b))
        out.append(v[len(v) // 2])
    return out


def dessine(p):
    lo, hi = min(p), max(p)
    R = " .:-=+*#%@"
    return "".join(R[min(9, int(9 * (v - lo) / max(1e-6, hi - lo)))] for v in p)


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        x0, y0, x1, y1 = CARTE[nom]
        W, H = x1 - x0, y1 - y0
        print("=" * 74)
        print(f"{nom} {path} {im.size}  carte {W}x{H}")
        for f in (0.68, 0.72, 0.74, 0.78):
            y = y0 + int(f * H)
            p = profil(im, y, x0 + 3, x1 - 3)
            print(f"  y={int(f*100)}% de la carte  lum {round(min(p),1)}..{round(max(p),1)}")
            print(f"     |{dessine(p)}|")
        y = y0 + int(0.68 * H)
        p = profil(im, y, x0 + 3, x1 - 3)
        print(f"  [ctrl positif] crête centrale (plastron/col) à y=68 % : "
              f"max={round(max(p),1)} sur un fond de veste ≈ {round(sorted(p)[len(p)//4],1)} "
              f"→ {'crête présente' if max(p) > sorted(p)[len(p)//4] + 60 else 'ABSENTE'}")
        y = y0 + int(0.96 * H)
        p = profil(im, y, x0 + 3, x1 - 3)
        print(f"  [ctrl négatif] rangée sous le buste (y=96 %) : amplitude = "
              f"{round(max(p)-min(p),1)} (attendu faible)")


main()
