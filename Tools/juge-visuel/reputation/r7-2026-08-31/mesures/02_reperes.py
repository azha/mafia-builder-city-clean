#!/usr/bin/env python3
"""Reperes: bornes du cadre dore, et frontieres horizontales des blocs,
exprimees en px CSS (ref /3.0, capture /3.6).
Contrôle positif : largeur du cadre en CSS doit etre ~= identique ref/capture.
Contrôle negatif : la meme mesure en px BRUTS doit differer (x1.2)."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def load(p):
    im = Image.open(p).convert("RGB")
    print("OUVERT", p.split("/")[-1], im.size)
    return im


def is_gold(c):
    r, g, b = c
    return r > 140 and g > 110 and b < 120 and r - b > 60


def scan_col(im, x, y0, y1):
    """retourne les y ou le pixel est dore, sur la colonne x"""
    p = im.load()
    return [y for y in range(y0, y1) if is_gold(p[x, y])]


def scan_row(im, y, x0, x1):
    p = im.load()
    return [x for x in range(x0, x1) if is_gold(p[x, y])]


def runs(vals, gap=3):
    out = []
    for v in vals:
        if out and v - out[-1][-1] <= gap:
            out[-1].append(v)
        else:
            out.append([v])
    return [(r[0], r[-1]) for r in out]


for name, path, s in (("REF", REF, 3.0), ("CAP", CAP, 3.6)):
    im = load(path)
    W, H = im.size
    # bord gauche du cadre dore : balayer une ligne au milieu vertical du cadre
    ymid = int(H * 0.55)
    r = runs(scan_row(im, ymid, 0, W))
    print(name, "ligne y=%d runs dores x:" % ymid, r)
    # bornes verticales du cadre : colonne juste sur le bord gauche
    if r:
        xb = (r[0][0] + r[0][1]) // 2
        c = runs(scan_col(im, xb, 0, H), gap=6)
        print(name, "colonne x=%d runs dores y:" % xb, c[:6], "..." if len(c) > 6 else "")
        top = c[0][0]
        bot = max(e for _, e in c)
        print(name, "CADRE y: %d -> %d  = %.1f px  = %.1f CSS" % (top, bot, bot - top, (bot - top) / s))
        left = r[0][0]
        right = r[-1][1]
        print(name, "CADRE x: %d -> %d  = %.1f px BRUTS  = %.1f CSS" % (left, right, right - left, (right - left) / s))
