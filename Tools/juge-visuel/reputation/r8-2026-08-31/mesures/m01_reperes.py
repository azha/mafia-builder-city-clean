#!/usr/bin/env python3
"""m01 — reperes: trouve le cadre dore (frame) dans la reference et la capture.
Controle positif: la largeur CSS du cadre doit valoir la meme valeur (~292 px CSS) des deux cotes.
Controle negatif: la hauteur en PX BRUTS doit differer (echelle 3.0 vs 3.6)."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def is_gold(p):
    r, g, b = p[:3]
    return r > 150 and 110 < g < 210 and b < 130 and r - b > 60


def frame(path):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    print(f"  {path.split('/')[-1]}  {W}x{H}")
    # colonnes: compte de pixels dores par colonne
    colc = [sum(1 for y in range(0, H, 2) if is_gold(px[x, y])) for x in range(W)]
    rowc = [sum(1 for x in range(0, W, 2) if is_gold(px[x, y])) for y in range(H)]
    # bord vertical du cadre = colonne avec beaucoup de dore
    thr_c = max(colc) * 0.5
    cols = [x for x, c in enumerate(colc) if c > thr_c]
    thr_r = max(rowc) * 0.5
    rows = [y for y, c in enumerate(rowc) if c > thr_r]
    return im, (min(cols), min(rows), max(cols), max(rows)), colc, rowc


for name, p, sc in (("REF", REF, 3.0), ("CAP", CAP, 3.6)):
    im, bb, colc, rowc = frame(p)
    x0, y0, x1, y1 = bb
    print(f"  {name} cadre bbox px = {bb}  -> l={x1-x0+1}px h={y1-y0+1}px")
    print(f"  {name} cadre CSS      = l={(x1-x0+1)/sc:.1f}  h={(y1-y0+1)/sc:.1f}  top={y0/sc:.1f}")
