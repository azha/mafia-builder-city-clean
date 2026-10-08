#!/usr/bin/env python3
"""M4 - TOUS les intervalles vides > 120 px du corps, avec leur couleur de fond.
Meme definition d'encre que 03. Sert a separer :
  - le BANDEAU DE TITRE vide (juste sous le decor),
  - le TROU de panneau (au milieu),
  - la marge basse normale (au-dessus du dock).
"""
from PIL import Image
import sys

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def med3(vals):
    return tuple(sorted(v[i] for v in vals)[len(vals) // 2] for i in range(3))


def holes(path, y0=430, ymargin=300, mini=120):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    xs = list(range(20, w - 20, 4))
    y1 = h - ymargin
    ink, medc = {}, {}
    for y in range(y0, y1):
        row = [px[x, y] for x in xs]
        m = med3(row)
        ink[y] = sum(1 for p in row if max(abs(p[i] - m[i]) for i in range(3)) > 24) / len(row)
        medc[y] = m
    res, cur = [], None
    for y in range(y0, y1 + 1):
        v = ink.get(y, 1.0)
        if v < 0.015:
            cur = y if cur is None else cur
        else:
            if cur is not None and y - cur >= mini:
                res.append((cur, y - 1, y - cur, med3([medc[t] for t in range(cur, y)])))
            cur = None
    return res, (y1 - y0)


for n in sys.argv[1:]:
    hs, util = holes(f'{CAP}{n}.png')
    for a, b, ln, col in hs:
        print(f'   trou y {a:5d}..{b:5d}  {ln:5d} px  {100*ln/util:5.1f} % du corps  fond={col}')
    if not hs:
        print('   aucun trou >= 120 px')
