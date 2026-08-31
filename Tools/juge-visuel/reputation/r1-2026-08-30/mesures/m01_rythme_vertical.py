#!/usr/bin/env python3
"""m01 — rythme vertical : où commencent et finissent les blocs, en px ET en px CSS.

Instrument : profil de ligne. Pour chaque ligne y, on compte les pixels qui ne sont
pas le fond, et on repère les frontières (transitions vide -> encre).
Échelle (dossier.md) : référence 900 px = 300 CSS (x3,0) ; capture 1080 px = 300 CSS (x3,6).

Contrôle positif : la largeur de chaque image est imprimée et doit valoir 900 / 1080.
Contrôle négatif : on imprime aussi le nombre de lignes VIDES ; s'il valait 0 partout,
l'instrument ne discriminerait pas.
"""
from PIL import Image
import sys

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
CAPS = {
    "cap1920": "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png",
    "cap2400": "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png",
}


def fond(im):
    """couleur dominante = fond, mesurée par histogramme."""
    cols = im.getcolors(im.size[0] * im.size[1])
    cols.sort(reverse=True)
    return cols[0][1], cols[0][0]


def proche(a, b, tol):
    return all(abs(a[i] - b[i]) <= tol for i in range(3))


def profil(im, tol=10, x0=None, x1=None):
    w, h = im.size
    px = im.load()
    bg, _ = fond(im)
    x0 = 0 if x0 is None else x0
    x1 = w if x1 is None else x1
    out = []
    for y in range(h):
        n = 0
        for x in range(x0, x1, 2):  # pas de 2 px : suffisant, 2x plus rapide
            if not proche(px[x, y], bg, tol):
                n += 1
        out.append(n)
    return bg, out


def frontieres(prof, seuil):
    """listes des segments [y0, y1] où le profil dépasse le seuil."""
    segs = []
    dedans = False
    for y, n in enumerate(prof):
        if n > seuil and not dedans:
            dedans = True
            d = y
        elif n <= seuil and dedans:
            dedans = False
            segs.append((d, y - 1))
    if dedans:
        segs.append((d, len(prof) - 1))
    return segs


def rapport(nom, path, echelle, y_debut=0):
    im = Image.open(path).convert("RGB")
    print(f"\n=== {nom} : {path}")
    print(f"    taille = {im.size}  (contrôle positif largeur)")
    bg, prof = profil(im)
    print(f"    fond dominant = {bg}")
    vides = sum(1 for n in prof if n <= 2)
    print(f"    lignes quasi-vides = {vides} / {im.size[1]}  (contrôle négatif : != 0 et != tout)")
    segs = frontieres(prof, 2)
    print(f"    segments d'encre (y0,y1,hauteur px,hauteur CSS) :")
    for a, b in segs:
        if b - a < 3:
            continue
        print(f"      {a:5d} {b:5d}  h={b-a+1:5d} px   {(b-a+1)/echelle:8.1f} CSS")
    return im, prof, segs


if __name__ == "__main__":
    rapport("REFERENCE m-120 (x3,0)", REF, 3.0)
    rapport("CAPTURE 1080x1920 (x3,6)", CAPS["cap1920"], 3.6)
    rapport("CAPTURE 1080x2400 (x3,6)", CAPS["cap2400"], 3.6)
