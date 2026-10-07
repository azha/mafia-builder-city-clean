#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m17 — l ECHELLE VERTICALE du panneau : bords, bandes d encre, gouttieres, dans une seule table.
Toutes les bandes sont trouvees par le MEME detecteur (colonnes x 150..370 pour le texte cale a
gauche ; x 400..680 pour « LA SUITE » qui est centre), au MEME seuil.
Controle positif : le haut du panneau trouve ici doit egaler celui lu au filet laiton du m4
(REF 828-829 · C19 885-886 · C24 1291-1292).
Controle negatif : une bande hors panneau (le decor) ne doit pas produire de ligne de texte.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 828, 1700),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 886, 1470),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1292, 1880),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def bandes(im, y0, y1, x0, x1, seuil):
    px = im.load()
    out = []; dedans = False; d = 0
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if lum(px[x, y]) > seuil)
        if n > 2 and not dedans:
            dedans = True; d = y
        elif n <= 2 and dedans:
            dedans = False
            if y - d > 3:
                out.append((d, y - 1))
    return out


def main():
    for k, (chemin, ytop, ybot) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        print('   CONTROLE POSITIF : haut du panneau = %d (filet laiton du m4)' % ytop)
        gch = bandes(im, ytop, ybot, 150, 370, 48)
        cen = bandes(im, ytop, ybot, 400, 680, 48)
        # « LA SUITE » = la 1re bande centree avant la 1re bande de gauche
        ls = [b for b in cen if not gch or b[0] < gch[0][0]]
        print('   « LA SUITE » (centre)      : %s' % (ls[:1] if ls else 'non trouve'))
        print('   bandes d encre a gauche    :')
        prec = ytop
        for i, (a, b) in enumerate(gch, 1):
            print('      %2d  y %4d..%4d  (hauteur %2d)   ecart a la bande precedente : %3d px'
                  % (i, a, b, b - a + 1, a - prec))
            prec = b
        if ls:
            print('   gouttiere haut-du-panneau -> « LA SUITE »   : %d px' % (ls[0][0] - ytop))
            if gch:
                print('   gouttiere « LA SUITE » -> 1er titre         : %d px' % (gch[0][0] - ls[0][1]))
        print()


if __name__ == '__main__':
    main()
