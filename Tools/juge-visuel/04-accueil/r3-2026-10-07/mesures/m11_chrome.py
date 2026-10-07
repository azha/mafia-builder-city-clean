#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m11 — le CHROME (bandeau, medaillon, volutes) : chaines IDENTIQUES comparees a l identique.
« ARGENT » et « CHALEUR » sont les MEMES mots dans la reference et dans la capture : leur
chasse se compare directement (echelle 1:1), et un ecart de chasse a hauteur de capitale egale
est un ecart d INTERLETTRAGE, pas de corps.
Intention CSS atelier : .aile .lib letter-spacing .18em (bandeau) ; .mano .lib letter-spacing .22em ;
.mano = 49 px CSS de diametre a x3,6 = 176,4 px ; bordure laiton 1,5 px CSS = 5,4 px ;
losange .mano::after 5,4 px CSS = 19,4 px, a -8,4 px CSS sous le medaillon.
Controle positif : la hauteur de capitale de « ARGENT » doit etre proche dans les deux images
(meme corps annonce) -> si elle l est et que la chasse differe, l ecart est bien l interlettrage.
Controle negatif : une bande vide du bandeau rend « aucune encre ».
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), {
        'ARGENT (libelle)':   (30, 330,  34,  62),
        'CHALEUR (medaillon)':(420, 660, 148, 178),
        'bande vide (ctrl-)': (300, 420,  10,  30),
    }),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), {
        'ARGENT (libelle)':   (30, 330,  18,  50),
        'CHALEUR (medaillon)':(420, 660, 152, 182),
        'bande vide (ctrl-)': (300, 420,  10,  30),
    }),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), {
        'ARGENT (libelle)':   (30, 330,  18,  50),
        'CHALEUR (medaillon)':(420, 660, 152, 182),
        'bande vide (ctrl-)': (300, 420,  10,  30),
    }),
}
MANO = {'REF': (400, 690, 10, 230), 'C19': (400, 690, 2, 230), 'C24': (400, 690, 2, 230)}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def est_laiton(p):
    r, g, b = p[:3]
    return r > 110 and r > g > b and (r - b) > 45


def encre(im, x0, x1, y0, y1, d=40):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if lum(px[x, y]) > fond + d]
    if len(pts) < 15:
        return None
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    ch = [[], [], []]
    pts2 = sorted(pts, key=lambda p: -lum(px[p[0], p[1]]))[:max(1, len(pts) // 8)]
    for x, y in pts2:
        p = px[x, y]
        for i in range(3):
            ch[i].append(p[i])
    coul = tuple(sorted(c)[len(c) // 2] for c in ch)
    return min(xs), max(xs), min(ys), max(ys), coul, len(pts)


def main():
    for k, (chemin, bandes) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        for nom, (x0, x1, y0, y1) in bandes.items():
            r = encre(im, x0, x1, y0, y1)
            if not r:
                print('   %-22s AUCUNE ENCRE' % nom)
                continue
            xa, xb, ya, yb, coul, n = r
            print('   %-22s chasse %4d px (x %4d..%4d) · hauteur %2d px (y %3d..%3d) · RGB %s'
                  % (nom, xb - xa + 1, xa, xb, yb - ya + 1, ya, yb, coul))
        # medaillon : anneau laiton
        mx0, mx1, my0, my1 = MANO[k]
        cols = [x for x in range(mx0, mx1) for y in range(my0, my1) if est_laiton(px[x, y])]
        rows = [y for x in range(mx0, mx1) for y in range(my0, my1) if est_laiton(px[x, y])]
        if cols:
            print('   %-22s anneau laiton x %4d..%4d (diametre %3d px) · y %3d..%3d (hauteur %3d px) · centre x=%.0f'
                  % ('MEDAILLON', min(cols), max(cols), max(cols) - min(cols) + 1,
                     min(rows), max(rows), max(rows) - min(rows) + 1, (min(cols) + max(cols)) / 2.0))
        print()


if __name__ == '__main__':
    main()
