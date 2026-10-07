#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m6b — les trois BOUTONS : boite exacte, REMPLISSAGE, couleur du LIBELLE.
Bornes verticales lues au profil (bande x 690..960) ; bornes horizontales lues au profil de
colonnes sur une ligne de REMPLISSAGE (entre le bord haut et le libelle).
Intention CSS de l atelier :
  .g4    { background:#ffffff0a ; border:1px solid #ffffff2a ; color:#eae0c8 }  -> bouton FANTOME
  .g4.or { background:linear-gradient(180deg,#e9c56b,#c99a37) ; color:#241804 }
Controle positif : le bouton OR doit sortir tres clair dans les DEUX images (lum > 130).
Controle negatif : une fenetre prise 60 px a GAUCHE du bouton (dans le verre nu) doit rendre
le fond du verre ; si elle rendait la meme chose que le remplissage, la sonde ne discriminerait pas.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            {'COMMANDER(or)': (945, 1037, 975), 'VOIR LA VENTE': (1159, 1251, 1178),
             'BLANCHIR': (1418, 1510, 1437)}),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            {'COMMANDER(or)': (968, 1052, 992), 'VOIR LA VENTE': (1113, 1197, 1132),
             'BLANCHIR': (1293, 1377, 1312)}),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            {'COMMANDER(or)': (1374, 1458, 1398), 'VOIR LA VENTE': (1519, 1603, 1538),
             'BLANCHIR': (1699, 1783, 1718)}),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, x0, x1, y0, y1):
    px = im.load()
    ch = [[], [], []]
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            for i in range(3):
                ch[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch)


def bornes_x(im, yfill, fondlum):
    px = im.load()
    xs = [x for x in range(500, 1060) if lum(px[x, yfill]) - fondlum > 4]
    if not xs:
        return None
    return xs[0], xs[-1]


def libelle(im, x0, x1, y0, y1):
    """couleur des pixels les plus clairs (le glyphe) et des plus sombres (le fond) de la zone."""
    px = im.load()
    pts = [(lum(px[x, y]), px[x, y]) for y in range(y0, y1) for x in range(x0, x1)]
    pts.sort(key=lambda t: t[0])
    n = len(pts)
    clair = pts[int(n * 0.98)]
    return clair[1], clair[0], n


def main():
    for k, (chemin, btns) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        # fond du verre : a gauche du bouton, 60 px, sur la meme ligne de remplissage
        for nom, (y0, y1, yfill) in btns.items():
            fond = med(im, 120, 200, yfill - 6, yfill + 6)
            fl = lum(fond)
            bx = bornes_x(im, yfill, fl)
            if bx is None:
                print('   %-15s pas de bouton detecte sur la ligne de remplissage y=%d' % (nom, yfill))
                continue
            x0, x1 = bx
            rempl = med(im, x0 + 20, x1 - 20, yfill - 5, yfill + 5)
            # libelle : bande centrale du bouton
            ymid = (y0 + y1) // 2
            lab, labl, n = libelle(im, x0 + 25, x1 - 25, ymid - 14, ymid + 14)
            print('   %-15s x %4d..%4d (%3d px) · y %4d..%4d (%3d px)' % (nom, x0, x1, x1 - x0 + 1, y0, y1, y1 - y0 + 1))
            print('   %-15s REMPLISSAGE RGB %-16s lum %6.1f   [controle negatif, verre nu x120..200 : RGB %s lum %.1f]'
                  % ('', str(rempl), lum(rempl), fond, fl))
            print('   %-15s LIBELLE (p98 clair) RGB %-16s lum %6.1f   contraste libelle/remplissage = %.2f:1'
                  % ('', str(lab), labl, (labl / 255.0 + 0.05) / (lum(rempl) / 255.0 + 0.05)))
        print()


if __name__ == '__main__':
    main()
