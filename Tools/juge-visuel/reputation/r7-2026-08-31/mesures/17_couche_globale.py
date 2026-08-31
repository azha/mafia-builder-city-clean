#!/usr/bin/env python3
"""Couche globale, DANS le cadre seulement (le fond sous le cadre est la place
du dock, hors sujet) : palette quantifiee, luminance moyenne, densite d'encre.
Puis le rythme vertical : les frontieres majeures et le VIDE sous la carte du
portrait, en px CSS et en % de la grande carte.
Contrôle positif : la couleur dominante doit etre la meme famille des 2 cotes.
Contrôle negatif : la palette d'une bande de titre (doree) doit differer de
celle du cadre entier."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 18, 881, 381, 1725), "CAP": (CAP, 3.6, 18, 1061, 24, 1638)}
# reperes mesures par 03/09 (y_local css) : (haut grande carte, bas grande carte,
#                                            haut carte portrait, bas carte portrait)
REP = {"REF": (109.0, 320.7, 117.0, 299.3), "CAP": (107.2, 324.7, 115.0, 287.2)}


def palette(im, box, k=6):
    c = im.crop(box).quantize(colors=k, method=Image.MEDIANCUT)
    pal = c.getpalette()
    tot = c.size[0] * c.size[1]
    out = []
    for n, i in sorted(c.getcolors(), reverse=True):
        out.append(((pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2]), 100.0 * n / tot))
    return out


for name in ("REF", "CAP"):
    path, s, xl, xr, yt, yb = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    box = (xl, yt, xr, yb)
    print("  %s cadre = %s  (%.1f x %.1f css)" % (name, box, (xr - xl) / s, (yb - yt) / s))
    print("  %s palette :" % name, "  ".join("%s %.1f%%" % (c, q) for c, q in palette(im, box)))
    g = im.crop(box).convert("L")
    px = list(g.getdata())
    print("  %s luminance moyenne = %.2f | densite d'encre (lum>40) = %.2f %%" % (
        name, sum(px) / float(len(px)), 100.0 * sum(1 for v in px if v > 40) / len(px)))
    hg, bg, hp, bp = REP[name]
    print("  %s RYTHME (css) : grande carte %.1f -> %.1f (H=%.1f) | carte portrait %.1f -> %.1f (H=%.1f)" % (
        name, hg, bg, bg - hg, hp, bp, bp - hp))
    print("  %s   marge HAUTE dans la grande carte = %.1f css | marge BASSE (le VIDE) = %.1f css | "
          "rapport bas/haut = %.2f | vide en %% de la grande carte = %.1f %%" % (
              name, hp - hg, bg - bp, (bg - bp) / (hp - hg), 100.0 * (bg - bp) / (bg - hg)))
    # CTRL- : palette de la bande du titre seule
    print("  CTRL- palette bande titre :", "  ".join(
        "%s %.1f%%" % (c, q) for c, q in palette(im, (xl, yt + int(10 * s), xr, yt + int(30 * s)), 3)))
