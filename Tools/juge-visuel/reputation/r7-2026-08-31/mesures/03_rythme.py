#!/usr/bin/env python3
"""Rythme vertical : frontieres des blocs DANS le cadre, en px CSS locales
(origine = bord haut interieur du cadre).
Methode : luminance moyenne par ligne sur une bande verticale, puis detection
des sauts. Contrôle positif : la 1re frontiere (haut du panneau-titre) doit
tomber au meme CSS des deux cotes."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
# repere etabli par 02_reperes.py
GEO = {"REF": (REF, 3.0, 381, 1725, 18, 881), "CAP": (CAP, 3.6, 24, 1638, 18, 1061)}


def prof(name):
    path, s, ytop, ybot, xl, xr = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    x0 = xl + int(0.02 * (xr - xl))
    x1 = xr - int(0.02 * (xr - xl))
    prev = None
    for y in range(ytop, ybot + 1):
        lum = sum(sum(p[x, y]) for x in range(x0, x1, 4)) / (3.0 * len(range(x0, x1, 4)))
        if prev is not None and abs(lum - prev) >= 4.0:
            print("  %s saut y=%d  css_local=%6.1f  lum %5.1f -> %5.1f" % (
                name, y, (y - ytop) / s, prev, lum))
        prev = lum


for n in ("REF", "CAP"):
    prof(n)
