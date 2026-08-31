#!/usr/bin/env python3
"""Etendue horizontale + couleur du reflet du miroir (la ligne turquoise).
Contrôle positif : sur la meme image, la ligne doree du titre (dont on SAIT
qu'elle couvre toute la largeur du panneau-titre) doit etre trouvee pleine.
Contrôle negatif : une ligne de fond vide doit donner 0 pixel."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 18, 881), "CAP": (CAP, 3.6, 24, 18, 1061)}


def teal(c):
    r, g, b = c
    return g > r + 12 and b > r + 8 and g > 55


def gold(c):
    r, g, b = c
    return r > 140 and g > 110 and b < 120 and r - b > 60


def extent(im, y, pred, x0, x1):
    p = im.load()
    xs = [x for x in range(x0, x1) if pred(p[x, y])]
    return (xs[0], xs[-1], len(xs)) if xs else None


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    # trouver la ligne turquoise : la ligne y de max de pixels turquoise dans la zone 150-200 css
    best = None
    for y in range(ytop + int(150 * s), ytop + int(200 * s)):
        n = sum(1 for x in range(xl, xr) if teal(p[x, y]))
        if best is None or n > best[1]:
            best = (y, n)
    y = best[0]
    e = extent(im, y, teal, xl, xr)
    print("  %s ligne miroir y=%d (css_local %.1f) : x %d->%d, %d px turquoise" % (
        name, y, (y - ytop) / s, e[0], e[1], e[2]))
    print("     x en CSS ecran : %.1f -> %.1f  (largeur %.1f CSS)" % (e[0] / s, e[1] / s, (e[1] - e[0]) / s))
    print("     couleur au centre :", p[(e[0] + e[1]) // 2, y])
    # epaisseur
    xm = (e[0] + e[1]) // 2
    ys = [yy for yy in range(y - 20, y + 20) if teal(p[xm, yy])]
    print("     epaisseur = %d px = %.1f CSS" % (len(ys), len(ys) / s))
    # CTRL+ : la regle doree du titre
    ygold = None
    for yy in range(ytop, ytop + int(70 * s)):
        n = sum(1 for x in range(xl, xr) if gold(p[x, yy]))
        if n > 400:
            ygold = yy
            break
    eg = extent(im, ygold, gold, xl, xr)
    print("  CTRL+ regle doree y=%d : x %d->%d = %.1f CSS de large" % (ygold, eg[0], eg[1], (eg[1] - eg[0]) / s))
    # CTRL- : une ligne de fond juste sous le cadre
    print("  CTRL- ligne de fond turquoise :", extent(im, ytop + int(300 * s), teal, xl, xl + 40))
