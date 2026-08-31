#!/usr/bin/env python3
"""Boites : la GRANDE CARTE (liseré bleu) et la CARTE DU PORTRAIT (liseré doré),
puis le VIDE entre le bas de la carte du portrait et le bas de la grande carte.
Contrôle positif : la largeur de la carte du portrait en css doit etre ~= des 2 cotes.
Contrôle negatif : la meme detection doree hors du cadre (marge basse) -> rien."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 18, 881), "CAP": (CAP, 3.6, 24, 18, 1061)}


def gold(c):
    r, g, b = c
    return r > 130 and 90 < g < 200 and b < 130 and r - b > 55


def runs(v, gap=4):
    o = []
    for x in v:
        if o and x - o[-1][-1] <= gap:
            o[-1].append(x)
        else:
            o.append([x])
    return [(q[0], q[-1]) for q in o]


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    # carte du portrait : liseré doré, dans la bande y_local 118..310, x < 150 css
    ys = range(ytop + int(118 * s), ytop + int(315 * s))
    xs = range(xl + int(8 * s), xl + int(145 * s))
    pts = [(x, y) for y in ys for x in xs if gold(p[x, y])]
    X = [a for a, _ in pts]; Y = [b for _, b in pts]
    print("  %s CARTE PORTRAIT : x %.1f -> %.1f css (largeur %.1f) | y_local %.1f -> %.1f css (hauteur %.1f)" % (
        name, min(X) / s, max(X) / s, (max(X) - min(X)) / s,
        (min(Y) - ytop) / s, (max(Y) - ytop) / s, (max(Y) - min(Y)) / s))
    bas_portrait = (max(Y) - ytop) / s
    # grande carte : liseré bleu clair -> mediane de rangee sur toute la largeur interieure
    def medlum(y, a, b):
        v = sorted(sum(p[x, y]) / 3.0 for x in range(a, b, 3))
        return v[len(v) // 2]
    a, b = xl + int(10 * s), xr - int(10 * s)
    bornes = []
    prev = None
    for y in range(ytop + int(110 * s), ytop + int(332 * s)):
        m = medlum(y, a, b)
        if prev is not None and (prev < 26 <= m or m < 26 <= prev):
            bornes.append((y - ytop) / s)
        prev = m
    print("  %s GRANDE CARTE : transitions du liseré (y_local css) ->" % name, [round(v, 1) for v in bornes])
    haut, bas = bornes[0], bornes[-1]
    print("  %s GRANDE CARTE : %.1f -> %.1f css (hauteur %.1f css)" % (name, haut, bas, bas - haut))
    print("  %s VIDE sous la carte du portrait, DANS la grande carte : %.1f css  (= %.1f %% de la grande carte)" % (
        name, bas - bas_portrait, 100.0 * (bas - bas_portrait) / (bas - haut)))
    # CTRL- : doré dans la marge basse hors cadre
    n = sum(1 for y in range(int(455 * s) + ytop, min(im.size[1], int(470 * s) + ytop))
            for x in range(xl, xr, 3) if gold(p[x, y]))
    print("  CTRL- pixels dores hors cadre (y_local 455-470) :", n)
