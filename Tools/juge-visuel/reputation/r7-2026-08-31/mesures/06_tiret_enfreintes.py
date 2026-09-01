#!/usr/bin/env python3
"""Perimetre de l'ecart assume 'ENFREINTES = tiret' : le tiret a-t-il la COULEUR
et la POSITION des deux autres chiffres ? On isole l'encre CYAN seule.
Contrôle positif : tuiles 0 et 1 (deux '00') doivent donner meme hauteur de
capitale et meme centre vertical, sur les deux images.
Contrôle negatif : sur la REFERENCE la tuile 2 porte '00' -> doit se comporter
comme les tuiles 0/1 (l'instrument ne doit PAS y voir de tiret)."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 18, 881, 68.0, 110.0), "CAP": (CAP, 3.6, 24, 18, 1061, 66.1, 108.3)}


def cyan(c):
    r, g, b = c
    return g > 150 and b > 150 and g - r > 40


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr, y0c, y1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    y0, y1 = ytop + int(y0c * s), ytop + int(y1c * s)
    W = xr - xl
    for i in range(3):
        ax = xl + int(W * i / 3.0) + int(4 * s)
        bx = xl + int(W * (i + 1) / 3.0) - int(4 * s)
        px = [(x, y) for y in range(y0, y1) for x in range(ax, bx) if cyan(p[x, y])]
        if not px:
            print("  %s tuile %d : AUCUNE ENCRE CYAN" % (name, i)); continue
        X = [a for a, _ in px]; Y = [b for _, b in px]
        cx_tuile = (ax + bx) / 2.0
        print("  %s tuile %d : cyan n=%d | x %.1f->%.1f css (centre %.1f, centre tuile %.1f, "
              "decalage %.2f css) | y_local %.1f->%.1f css | hauteur %.1f css | centre_y %.1f css" % (
                  name, i, len(px), min(X) / s, max(X) / s, (min(X) + max(X)) / 2.0 / s,
                  cx_tuile / s, ((min(X) + max(X)) / 2.0 - cx_tuile) / s,
                  (min(Y) - ytop) / s, (max(Y) - ytop) / s, (max(Y) - min(Y) + 1) / s,
                  ((min(Y) + max(Y)) / 2.0 - ytop) / s))
