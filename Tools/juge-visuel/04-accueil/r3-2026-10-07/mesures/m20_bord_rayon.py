#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m20 — BORD et RAYON du panneau. .verre{border:1px solid #ffffff17; border-radius:12px}
-> a x3,6 : liseré de 3,6 px, rayon 43 px.
Le liseré se lit comme un MAXIMUM LOCAL de luminance a la traversee du bord : on balaie
10 lignes du panneau et on regarde si la colonne du bord est plus claire que ses deux voisines.
Le rayon se lit par la position du bord gauche en fonction de la distance au haut du panneau.
Controle positif : la reference DOIT montrer le maximum local (le liseré y existe par construction).
Controle negatif : une colonne au milieu du verre ne doit pas etre un maximum local.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 828, 1637),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 886, 1449),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1292, 1855),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def main():
    for k, (chemin, ytop, ybot) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s  (panneau y %d..%d)' % (k, im.size, os.path.basename(chemin), ytop, ybot))
        print('   liseré au bord GAUCHE (x=49) : profil x 44..56')
        for y in (ytop + 120, ytop + 260, ytop + 400, ybot - 40):
            prof = ' '.join('%d:%3.0f' % (x, lum(px[x, y])) for x in range(44, 57))
            v = [lum(px[x, y]) for x in range(44, 57)]
            i = v.index(max(v))
            print('      y=%4d  %s   -> max local a x=%d (%.0f)' % (y, prof, 44 + i, max(v)))
        print('   [controle negatif] milieu du verre x 540..552, y=%d : %s'
              % (ytop + 260, ' '.join('%3.0f' % lum(px[x, ytop + 260]) for x in range(540, 553))))
        print('   RAYON du coin haut-gauche : bord gauche selon la distance au haut du panneau')
        for dy in (2, 6, 12, 20, 30, 43, 60, 90):
            y = ytop + dy
            # premier x (en partant de 0) ou l on entre dans le verre : saut de luminance
            L = [lum(px[x, y]) for x in range(0, 200)]
            fond = sorted(L[0:40])[20]
            verre = sorted(lum(px[x, y]) for x in range(300, 700))[200]
            seuil = (fond + verre) / 2.0
            xg = next((x for x in range(0, 200) if (L[x] < seuil) == (verre < fond)), None)
            print('      +%3d px sous le haut : bord gauche a x=%s' % (dy, xg))
        print()


if __name__ == '__main__':
    main()
