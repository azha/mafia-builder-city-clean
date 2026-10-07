#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m14 — le DOCK : diametres des ronds, ecarts, trait de l onglet actif, pastille FAMILLE.
Polarite explicite : les ronds sont SOMBRES sur leur voisinage. On balaie une ligne et on
retient les plages dont la luminance est INFERIEURE a la mediane locale - 6.
Intention CSS atelier : .rd 35,2 px CSS -> 126,7 px ; gap 16,8 -> 60,5 px ;
.pt 10,7 px CSS -> 38,5 px de large ; .disc 6,1 px CSS -> 22 px.
Controle positif : la reference doit rendre 4 ronds de 127 px espaces de 60 px (valeurs CSS).
Controle negatif : la meme procedure 200 px plus haut (hors dock) ne doit pas rendre 4 ronds egaux.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 1890, 2102),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 1700, 1920),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 2180, 2400),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def est_or(p):
    r, g, b = p[:3]
    return r > 120 and r > g > b and (r - b) > 55


def plages_sombres(im, y, x0=60, x1=1020, marge=6):
    px = im.load()
    L = [lum(px[x, y]) for x in range(x0, x1)]
    med = sorted(L)[len(L) // 2]
    cols = [x0 + i for i, v in enumerate(L) if v < med - marge]
    if not cols:
        return [], med
    grp = []; d = cols[0]; p = cols[0]
    for x in cols[1:]:
        if x - p > 8:
            grp.append((d, p)); d = x
        p = x
    grp.append((d, p))
    return [g for g in grp if g[1] - g[0] > 40], med


def main():
    for k, (chemin, y0, y1) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        meilleur = None
        for y in range(y0, y1):
            g, med = plages_sombres(im, y)
            if len(g) == 4:
                larg = sum(b - a + 1 for a, b in g)
                if meilleur is None or larg > meilleur[2]:
                    meilleur = (y, g, larg)
        if not meilleur:
            print('   AUCUNE ligne a 4 ronds trouvee')
            continue
        y, g, _ = meilleur
        diam = [b - a + 1 for a, b in g]
        ec = [g[i + 1][0] - g[i][1] - 1 for i in range(3)]
        print('   ligne y=%d : 4 ronds %s · diametres %s · ecarts %s · empan total %d px (x %d..%d)'
              % (y, [(a, b) for a, b in g], diam, ec, g[-1][1] - g[0][0] + 1, g[0][0], g[-1][1]))
        # hauteur du 1er rond (coupe verticale en son centre)
        cx = (g[0][0] + g[0][1]) // 2
        col = []
        for yy in range(y0, y1):
            L = [lum(px[x, yy]) for x in range(60, 1020)]
            med = sorted(L)[len(L) // 2]
            if lum(px[cx, yy]) < med - 6:
                col.append(yy)
        if col:
            print('      1er rond, coupe verticale x=%d : y %d..%d (hauteur %d px)'
                  % (cx, col[0], col[-1], col[-1] - col[0] + 1))
        # trait de l onglet actif (or) sous le 1er rond
        tr = [(x, yy) for yy in range(y, y1) for x in range(g[0][0] - 20, g[0][1] + 20) if est_or(px[x, yy])]
        if tr:
            xs = [p[0] for p in tr]; ys = [p[1] for p in tr]
            print('      trait ACTIF sous le 1er rond : x %d..%d (largeur %d px) · y %d..%d (hauteur %d px)'
                  % (min(xs), max(xs), max(xs) - min(xs) + 1, min(ys), max(ys), max(ys) - min(ys) + 1))
        else:
            print('      trait ACTIF sous le 1er rond : ABSENT')
        # pastille sur le 2e rond (FAMILLE) : or dans le quart haut-droit du rond
        a, b = g[1]
        pa = [(x, yy) for yy in range(y - 90, y + 20) for x in range(a - 25, b + 25) if est_or(px[x, yy])]
        if pa:
            xs = [p[0] for p in pa]; ys = [p[1] for p in pa]
            print('      pastille FAMILLE : PRESENTE x %d..%d y %d..%d (%dx%d px)'
                  % (min(xs), max(xs), min(ys), max(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1))
        else:
            print('      pastille FAMILLE : ABSENTE (0 px or dans le rond 2 et son pourtour)')
        print()


if __name__ == '__main__':
    main()
