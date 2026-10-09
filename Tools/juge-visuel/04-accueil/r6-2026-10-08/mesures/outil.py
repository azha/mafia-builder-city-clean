#!/usr/bin/env python3
"""outil.py — briques communes. AUCUNE mesure ici ; seulement des fonctions.

Echelle (dossier.md L37-41) : REF 1080px / 300 CSS = x3,6 ; CAP 1080px / 300 CSS = x3,6.
=> 1 px CSS = 3,6 px image des DEUX cotes. Rapport X = 1,000. AUCUN rapport en Y.
"""
import os
from PIL import Image

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-r2"

IMAGES = {
    "ref4":    os.path.join(REF, "A01-cadre-4-la-suite.png"),
    "ref5":    os.path.join(REF, "A01-cadre-5-tete-sur-ligne-haute.png"),
    "c24":     os.path.join(CAP, "A01_AccueilFile2Cartes_1080x2400.png"),
    "c19":     os.path.join(CAP, "A01_AccueilFile2Cartes_1080x1920.png"),
    "l24":     os.path.join(CAP, "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png"),
    "l19":     os.path.join(CAP, "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png"),
}

ECHELLE = 3.6  # px image par px CSS, des DEUX cotes


def ouvrir(cle, bavard=True):
    p = IMAGES[cle]
    im = Image.open(p).convert("RGB")
    if bavard:
        print(f"[ouvert] {cle:5s} {os.path.basename(p):55s} {im.size[0]}x{im.size[1]}")
    return im


def css(px):
    return px / ECHELLE


def lum(c):
    """luminance relative WCAG."""
    def f(v):
        v /= 255.0
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contraste(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def mediane_fenetre(im, cx, cy, r=4):
    """mediane par canal d'une fenetre (2r+1)^2 — jamais un pixel seul."""
    px = im.load()
    W, H = im.size
    canaux = [[], [], []]
    for y in range(max(0, cy - r), min(H, cy + r + 1)):
        for x in range(max(0, cx - r), min(W, cx + r + 1)):
            p = px[x, y]
            for i in range(3):
                canaux[i].append(p[i])
    out = []
    for c in canaux:
        c.sort()
        out.append(c[len(c) // 2])
    return tuple(out)


def luminance_simple(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil_ligne_h(im, y, x0=0, x1=None):
    px = im.load()
    x1 = x1 if x1 is not None else im.size[0]
    return [px[x, y] for x in range(x0, x1)]


def bbox_encre(im, x0, y0, x1, y1, seuil, plus_clair=True):
    """bbox de l'ENCRE (pixels au-dessus/en-dessous d'un seuil de luminance)
    dans la fenetre donnee. Retourne None si rien."""
    px = im.load()
    minx = miny = 10 ** 9
    maxx = maxy = -1
    n = 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            L = luminance_simple(px[x, y])
            ok = (L >= seuil) if plus_clair else (L <= seuil)
            if ok:
                n += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if maxx < 0:
        return None
    return (minx, miny, maxx, maxy, n)
