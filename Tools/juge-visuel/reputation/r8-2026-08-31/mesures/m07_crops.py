#!/usr/bin/env python3
"""m07 — crops apparies, RAMENES A LA MEME ECHELLE CSS (les deux redimensionnes a 4 px/CSS),
empiles verticalement REF puis CAP. Sert a l'oeil, pas au chiffre.
Repere m01. Controle: la largeur en sortie est identique pour les deux (meme fenetre CSS)."""
from PIL import Image
import sys

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)
OUT = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/mesures/"
K = 4.0

ZONES = {
    "titre":   (4, 6, 296, 106),
    "portrait": (10, 110, 150, 310),
    "liste":   (140, 108, 296, 300),
    "verdict": (4, 330, 296, 455),
}


def crop(path, sc, left, top, z):
    im = Image.open(path).convert("RGB")
    x0 = int(left + z[0] * sc); y0 = int(top + z[1] * sc)
    x1 = int(left + z[2] * sc); y1 = int(top + z[3] * sc)
    c = im.crop((x0, y0, x1, y1))
    w = int((z[2] - z[0]) * K); h = int((z[3] - z[1]) * K)
    return im.size, c.resize((w, h), Image.LANCZOS)


for name, z in ZONES.items():
    outs = []
    for lbl, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
        s, c = crop(p, sc, l, t, z)
        print(f"{name} {lbl} source={p.split('/')[-1]} {s} -> crop {c.size}")
        outs.append(c)
    W = max(o.width for o in outs)
    H = sum(o.height for o in outs) + 12
    canvas = Image.new("RGB", (W, H), (255, 0, 255))
    y = 0
    for o in outs:
        canvas.paste(o, (0, y)); y += o.height + 12
    canvas.save(OUT + f"crop_{name}.png")
    print(f"  -> crop_{name}.png {canvas.size}")
