# -*- coding: utf-8 -*-
"""Boîte à outils du juge visuel ⊥ de groupe (2026-10-07). PIL seul, pas de numpy.

Chaque fonction imprime ce qu'elle lit quand on la lance ; les scripts appelants impriment
la TAILLE de chaque image ouverte (preuve qu'ils ont lu le bon fichier).
"""
from PIL import Image
import os


def ouvrir(chemin):
    im = Image.open(chemin).convert('RGB')
    print('  lu : %-78s %dx%d' % (os.path.basename(chemin), im.size[0], im.size[1]))
    return im


def mediane_fenetre(im, x0, y0, x1, y1):
    """Médiane par canal d'une fenêtre — jamais un pixel seul (anti-crénelage)."""
    px = list(im.crop((x0, y0, x1, y1)).getdata())
    if not px:
        return None
    out = []
    for c in range(3):
        v = sorted(p[c] for p in px)
        out.append(v[len(v) // 2])
    return tuple(out)


def lum(c):
    """Luminance relative WCAG."""
    def f(u):
        u /= 255.0
        return u / 12.92 if u <= 0.03928 else ((u + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2])


def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def profil_lignes(im, x0, x1, y0, y1):
    """Luminance moyenne de chaque ligne entre y0 et y1, sur la bande [x0,x1[."""
    out = []
    for y in range(y0, y1):
        px = list(im.crop((x0, y, x1, y + 1)).getdata())
        out.append((y, sum(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in px) / len(px)))
    return out


def profil_colonnes(im, y0, y1, x0, x1):
    out = []
    for x in range(x0, x1):
        px = list(im.crop((x, y0, x + 1, y1)).getdata())
        out.append((x, sum(0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] for p in px) / len(px)))
    return out


def bbox_encre(im, x0, y0, x1, y1, seuil=60):
    """Boîte de l'ENCRE (pixels plus clairs que `seuil`) dans la fenêtre — jamais un rect supposé."""
    reg = im.crop((x0, y0, x1, y1))
    w, h = reg.size
    d = list(reg.getdata())
    minx, miny, maxx, maxy, n = w, h, -1, -1, 0
    for i, p in enumerate(d):
        if 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2] > seuil:
            x, y = i % w, i // w
            n += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
    if n == 0:
        return None
    return (x0 + minx, y0 + miny, x0 + maxx, y0 + maxy, n)


def palette(im, n=6, taille=160):
    """Palette quantifiée : les n couleurs qui couvrent le plus d'aire, avec leur %."""
    pt = im.resize((taille, int(taille * im.size[1] / im.size[0]))).quantize(colors=16)
    pal = pt.getpalette()
    tot = pt.size[0] * pt.size[1]
    cnt = sorted(pt.getcolors(), reverse=True)[:n]
    return [((pal[i * 3], pal[i * 3 + 1], pal[i * 3 + 2]), 100.0 * c / tot) for c, i in cnt]


def hexa(c):
    return '#%02x%02x%02x' % c


def dhex(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))
