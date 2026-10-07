#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m9 — LARGEUR des trois boutons (bornee au PANNEAU x 50..1029 — hors panneau le decor fausse tout)
et consequence sur la colonne de texte (.t4{flex:1}).
Controle positif : le bouton OR, tres clair, doit sortir avec les memes bornes par deux seuils
differents (+8 et +25 de luminance au-dessus du verre).
Controle negatif : une ligne prise entre deux rangees (sans bouton) doit rendre une largeur nulle.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            [('COMMANDER (or)', 990), ('VOIR LA VENTE', 1178), ('BLANCHIR', 1437),
             ('INTER-RANGEE (ctrl neg.)', 1100)]),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            [('COMMANDER (or)', 1010), ('VOIR LA VENTE', 1132), ('BLANCHIR', 1312),
             ('INTER-RANGEE (ctrl neg.)', 1086)]),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            [('COMMANDER (or)', 1416), ('VOIR LA VENTE', 1538), ('BLANCHIR', 1718),
             ('INTER-RANGEE (ctrl neg.)', 1492)]),
}
XG, XD = 580, 1028


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def bornes(im, y, d):
    px = im.load()
    L = [lum(px[x, y]) for x in range(XG, XD + 1)]
    fond = sorted(L)[len(L) // 10]
    xs = [XG + i for i, v in enumerate(L) if v - fond > d]
    if not xs:
        return None, fond
    return (xs[0], xs[-1], xs[-1] - xs[0] + 1), fond


def main():
    for k, (chemin, lignes) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        for nom, y in lignes:
            for d in (8, 25):
                b, fond = bornes(im, y, d)
                if b is None:
                    print('   %-26s y=%4d seuil +%2d : AUCUN objet (verre=%.1f)' % (nom, y, d, fond))
                else:
                    print('   %-26s y=%4d seuil +%2d : x %4d..%4d  LARGEUR %4d px (%.1f%% du panneau 982 px) · verre=%.1f'
                          % (nom, y, d, b[0], b[1], b[2], 100.0 * b[2] / 982, fond))
        print()


if __name__ == '__main__':
    main()
