#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — le fond des tuiles compteurs : la maquette y pose un DÉGRADÉ.
Profil pris dans une bande SANS glyphe (les 8 px juste sous le liseré haut de
la tuile), de gauche à droite.

CONTRÔLE POSITIF : la gouttière du panneau racine (aplat connu) doit donner une
amplitude ~0 dans les deux images.
CONTRÔLE NÉGATIF : le même profil pris sur une bande QUI TRAVERSE les chiffres
doit donner une amplitude énorme — c'est ce qui prouve que le profil réagit.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CFG = {"REF": dict(k=3.0, tuile=(43, 585, 300, 678), gouttiere=(24, 40)),
       "JEU": dict(k=3.6, tuile=(47, 262, 359, 377), gouttiere=(24, 45))}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, cx, cy, r=2):
    px = im.load()
    v = sorted((px[x, y] for x in range(cx - r, cx + r + 1)
                for y in range(cy - r, cy + r + 1)), key=lum)
    return v[len(v) // 2]


def profil(im, x0, x1, y, n=9):
    return [med(im, int(x0 + (x1 - x0) * i / (n - 1.0)), y) for i in range(n)]


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        c = CFG[nom]
        a, b, cc, d = c["tuile"]
        print("=" * 74)
        print(f"{nom} {path} {im.size}  tuile 1 = ({a},{b})-({cc},{d})")
        for lib, y in (("bande haute (sans glyphe)", b + 6),
                       ("bande basse (sans glyphe)", d - 6)):
            p = profil(im, a + 6, cc - 6, y)
            amp = max(lum(q) for q in p) - min(lum(q) for q in p)
            print(f"  {lib} y={y} : {p}")
            print(f"     amplitude = {round(amp,1)} → {'DÉGRADÉ' if amp > 3 else 'APLAT'}")
        # profil vertical au bord gauche de la tuile (hors glyphes)
        px = im.load()
        pv = [med(im, a + 8, int(b + 6 + (d - b - 12) * i / 6.0)) for i in range(7)]
        ampv = max(lum(q) for q in pv) - min(lum(q) for q in pv)
        print(f"  profil vertical bord gauche : {pv}")
        print(f"     amplitude = {round(ampv,1)} → {'DÉGRADÉ' if ampv > 3 else 'APLAT'}")
        g = [med(im, c["gouttiere"][0], y) for y in range(b + 8, d - 8, 6)]
        print(f"  [ctrl positif] gouttière : amplitude = "
              f"{round(max(lum(q) for q in g)-min(lum(q) for q in g),1)} (attendu ~0)")
        pn = profil(im, a + 6, cc - 6, (b + d) // 2)
        print(f"  [ctrl négatif] bande traversant les chiffres : amplitude = "
              f"{round(max(lum(q) for q in pn)-min(lum(q) for q in pn),1)} (attendu ≫ 0)")


main()
