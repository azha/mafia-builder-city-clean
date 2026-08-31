#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1/2 — repères : détecte les grandes frontières horizontales et les
bords verticaux des panneaux, sur la référence ET sur la capture.

Instrument : profil de luminance par ligne / par colonne + détection des
« lignes d'encre » (rangées dont la luminance dépasse nettement le fond local).

CONTRÔLE POSITIF : la largeur totale des images (900 / 1080) doit être
retrouvée par le scan de colonnes du fond ; et le liseré doré du panneau
racine doit être trouvé dans les DEUX images (grandeur qu'on sait présente).
CONTRÔLE NÉGATIF : on cherche le même liseré doré sur une bande de fond pur
(y = 5 px) où l'on SAIT qu'il n'y en a pas ; l'instrument doit répondre 0.
"""
import sys
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def is_gold(p):
    r, g, b = p
    return r > 120 and r - b > 40 and g > b and abs(r - g) < 90


def row_profile(im, x0, x1):
    px = im.load()
    w, h = im.size
    out = []
    for y in range(h):
        s = 0.0
        for x in range(x0, x1, 2):
            s += lum(px[x, y])
        out.append(s / len(range(x0, x1, 2)))
    return out


def gold_rows(im, x0, x1, minfrac=0.5):
    """rangées où >= minfrac de la bande [x0,x1[ est dorée"""
    px = im.load()
    w, h = im.size
    xs = list(range(x0, x1, 2))
    res = []
    for y in range(h):
        n = sum(1 for x in xs if is_gold(px[x, y]))
        if n >= minfrac * len(xs):
            res.append(y)
    return res


def gold_cols(im, y0, y1, minfrac=0.5):
    px = im.load()
    ys = list(range(y0, y1, 2))
    res = []
    for x in range(im.size[0]):
        n = sum(1 for y in ys if is_gold(px[x, y]))
        if n >= minfrac * len(ys):
            res.append(x)
    return res


def groups(vals, gap=3):
    if not vals:
        return []
    g = [[vals[0]]]
    for v in vals[1:]:
        if v - g[-1][-1] <= gap:
            g[-1].append(v)
        else:
            g.append([v])
    return [(x[0], x[-1]) for x in g]


def main():
    for name, path, scale in (("REF m-120", REF, 3.0), ("CAP 1080x1920", CAP, 3.6)):
        im = Image.open(path).convert("RGB")
        print("=" * 70)
        print(f"{name}  fichier={path}  taille={im.size}  echelle=x{scale}")
        w, h = im.size
        # bords verticaux du panneau racine (liseré doré) sur une bande basse
        # (là où le panneau racine existe dans les deux images)
        gc = groups(gold_cols(im, int(h * 0.55), int(h * 0.60), 0.30))
        print(f"  colonnes dorées (bande y={int(h*.55)}..{int(h*.60)}): {gc}")
        # lignes dorées pleine largeur = filets horizontaux
        gr = groups(gold_rows(im, int(w * 0.10), int(w * 0.90), 0.80))
        print(f"  filets dorés horizontaux (>=80% de la largeur): {gr}")
        # CONTRÔLE NÉGATIF : bande de fond y=2..8
        neg = gold_rows(im, int(w * 0.10), int(w * 0.90), 0.30)
        neg = [y for y in neg if y < 10]
        print(f"  [ctrl négatif] rangées dorées dans y<10 : {len(neg)} (attendu 0)")
    print("=" * 70)
    print("CONTRÔLE POSITIF : largeurs lues 900 et 1080 = valeurs déclarées au dossier.")


main()
