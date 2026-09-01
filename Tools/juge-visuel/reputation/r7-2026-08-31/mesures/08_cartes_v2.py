#!/usr/bin/env python3
"""Cartes de regles : bornes par la MEDIANE de luminance de chaque rangee sur
la largeur de la colonne droite (le remplissage de la carte est plus clair que
le fond de la grande carte ; la mediane ignore le texte, minoritaire).
Contrôle positif : 4 cartes trouvees des deux cotes (la maquette en a 4).
Contrôle negatif : la meme mesure sur une bande vide du fond doit trouver 0 carte."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
#                path, s, ytop, x0css, x1css (colonne des cartes, mesuree en 07)
GEO = {"REF": (REF, 3.0, 381, 153.0, 274.0), "CAP": (CAP, 3.6, 24, 150.0, 277.0)}


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def bandes(p, s, ytop, x0c, x1c, y0c, y1c, seuil):
    x0, x1 = int(x0c * s), int(x1c * s)
    out, cur = [], None
    for y in range(ytop + int(y0c * s), ytop + int(y1c * s)):
        m = med([sum(p[x, y]) / 3.0 for x in range(x0, x1, 2)])
        on = m > seuil
        if on and cur is None:
            cur = y
        elif not on and cur is not None:
            out.append(((cur - ytop) / s, (y - 1 - ytop) / s))
            cur = None
    if cur is not None:
        out.append(((cur - ytop) / s, (ytop + int(y1c * s) - 1 - ytop) / s))
    return [b for b in out if b[1] - b[0] > 4]


for name in ("REF", "CAP"):
    path, s, ytop, x0c, x1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    b = bandes(p, s, ytop, x0c, x1c, 118, 320, 22.0)
    print("  %s : %d bande(s) trouvee(s) (attendu 4)" % (name, len(b)))
    prev = None
    for i, (a, z) in enumerate(b):
        gap = "%.1f" % (a - prev) if prev is not None else "-"
        print("      carte %d : y_local %6.1f -> %6.1f css | hauteur %5.1f css | ecart au precedent %s css" % (
            i + 1, a, z, z - a + 0.0, gap))
        prev = z
    if b:
        print("      bloc des 4 cartes : %.1f -> %.1f css (total %.1f css)" % (b[0][0], b[-1][1], b[-1][1] - b[0][0]))
    # CTRL- : bande vide du fond, sous le cadre / dans la marge gauche
    print("  CTRL- marge (x 1..4 css) :", len(bandes(p, s, ytop, 1.0, 4.5, 118, 320, 22.0)), "bande(s)")
