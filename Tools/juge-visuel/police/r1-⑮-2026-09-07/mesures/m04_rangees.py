# -*- coding: utf-8 -*-
"""m04 — bbox d'encre et segments horizontaux de chaque rangee de la CAPTURE.
Contrôle positif : le filet du bandeau (y 140..145) doit rendre un segment quasi pleine largeur.
Contrôle negatif : une bande du grand vide (y 1400..1410) ne doit rendre AUCUN segment.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(D, 'capture-1080x2400.png')
im = Image.open(p).convert('RGB'); print("OUVERT capture taille=%s" % (im.size,))
g = im.convert('L'); px = g.load(); W, H = g.size
SEUIL = 45

def segments(y0, y1, trou=14):
    cols = []
    for x in range(W):
        v = 0
        for y in range(y0, y1+1):
            if px[x, y] > SEUIL: v = 1; break
        cols.append(v)
    seg = []; cur = None
    for x, v in enumerate(cols):
        if v:
            if cur is None: cur = [x, x]
            else: cur[1] = x
        else:
            if cur is not None and x - cur[1] > trou:
                seg.append(tuple(cur)); cur = None
    if cur is not None: seg.append(tuple(cur))
    return seg

def hauteur_encre(y0, y1, x0, x1):
    ys = [y for y in range(y0, y1+1) if any(px[x, y] > SEUIL for x in range(x0, x1+1))]
    return (min(ys), max(ys), max(ys)-min(ys)+1) if ys else (None, None, 0)

RANGEES = [
 ('filet bandeau (CTRL+)',140,145),
 ('losange',           215,231),
 ('titre LES INSPECTIONS',268,303),
 ('sous-titre district',344,368),
 ('rangee Charge',      404,435),
 ('entete PAR GRAVITE', 457,482),
 ('rangee Critique',    515,545),
 ('rangee Elevee',      568,597),
 ('rangee Moyenne',     630,659),
 ('rangee Faible',      687,712),
 ('entete PAR PROVENANCE',744,764),
 ('rangee Programmee',  796,827),
 ('rangee Indicateur',  855,879),
 ('rangee Faux rapport',912,941),
 ('rangee Rapport fonde',968,998),
 ('rangee Cascade',    1026,1051),
 ('rangee Medico-legal',1082,1113),
 ('VIDE (CTRL-)',      1400,1410),
]
for nom, a, b in RANGEES:
    s = segments(a, b)
    hh = hauteur_encre(a, b, 0, W-1)
    print("%-24s y=%4d..%-4d  encre y=%s..%s (h=%d)  %d segments" % (nom, a, b, hh[0], hh[1], hh[2], len(s)))
    for x0, x1 in s:
        print("        x %4d..%-4d  (l=%3d)" % (x0, x1, x1-x0+1))
