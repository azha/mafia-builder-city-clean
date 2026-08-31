#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — profil horizontal du REFLET : étendue, épaisseur, intensité,
et ce qu'il recouvre. Score cyan = min(G,B) - R, mesuré RELATIVEMENT au fond
local (3 px au-dessus du trait), pour ne pas confondre le reflet avec le fond
bleuté d'une tuile.

CONTRÔLE POSITIF : sur les colonnes où le reflet est manifeste (au-dessus des
tuiles), le score relatif doit être franchement > 0 dans les deux images.
CONTRÔLE NÉGATIF : le même score relatif mesuré 200 px plus bas doit être ~0.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil(im, yline, dy, x0, x1, pas):
    px = im.load()
    out = []
    for x in range(x0, x1, pas):
        a = lum(px[x, yline])
        b = lum(px[x, yline - dy])
        out.append((x, round(a - b, 1)))
    return out


def epaisseur(im, x, yc, fond_dy=12, seuil=3):
    px = im.load()
    base = lum(px[x, yc - fond_dy])
    n = 0
    for y in range(yc - fond_dy, yc + fond_dy):
        if lum(px[x, y]) - base >= seuil:
            n += 1
    return n


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}   CAP {CAP} {cap.size}")
    print("\nREF — reflet à y=905, surcroît de luminance par rapport à y=893")
    print("  ", profil(ref, 905, 12, 22, 880, 40))
    print("  épaisseur (px) à x=300 :", epaisseur(ref, 300, 905),
          " à x=600 :", epaisseur(ref, 600, 905))
    print("  [ctrl -] même profil 200 px plus bas (y=1105) :")
    print("  ", profil(ref, 1105, 12, 22, 880, 120))

    print("\nJEU — reflet à y=636, surcroît de luminance par rapport à y=622")
    print("  ", profil(cap, 636, 14, 22, 1058, 48))
    print("  épaisseur (px) à x=360 :", epaisseur(cap, 360, 636),
          " à x=700 :", epaisseur(cap, 700, 636))
    print("  [ctrl -] même profil 200 px plus bas (y=836) :")
    print("  ", profil(cap, 836, 14, 22, 1058, 144))


main()
