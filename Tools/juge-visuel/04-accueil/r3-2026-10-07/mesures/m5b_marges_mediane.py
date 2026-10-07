#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m5b — marges laterales du panneau par MEDIANE DE COLONNE sur toute la hauteur du panneau.
La mediane est insensible au texte (minoritaire dans une colonne haute) ; le verre est sombre,
le decor autour est clair (capture) ou moins plat (reference).
Controle positif : la reference doit rendre une largeur proche de 276 px CSS x3,6 = 994 px
(intention .verre{margin:0 12px}).
Controle negatif : la meme mediane calculee SOUS le panneau (barre TRANCHER exclue) ne doit PAS
rendre la meme plage -> preuve que la plage mesuree est bien celle du panneau.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 832, 1655),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 890, 1444),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1296, 1851),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med_cols(im, y0, y1):
    px = im.load()
    out = []
    for x in range(im.width):
        v = sorted(lum(px[x, y]) for y in range(y0, y1, 2))
        out.append(v[len(v) // 2])
    return out


def plage(p, centre=540, marge=12):
    base = sorted(p[centre - 200:centre + 200])[200]
    seuil = base + marge
    g = centre
    while g > 0 and p[g - 1] <= seuil:
        g -= 1
    d = centre
    while d < len(p) - 1 and p[d + 1] <= seuil:
        d += 1
    return g, d, base, seuil


def main():
    for k, (chemin, y0, y1) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s   bande verticale y %d..%d (hauteur %d)'
              % (k, im.size, os.path.basename(chemin), y0, y1, y1 - y0))
        p = med_cols(im, y0, y1)
        g, d, base, s = plage(p)
        print('   mediane du verre=%.1f  seuil=%.1f' % (base, s))
        print('   BORD GAUCHE x=%d  BORD DROIT x=%d  LARGEUR=%d  marges %d / %d'
              % (g, d, d - g + 1, g, im.width - 1 - d))
        print('   gauche  ' + ' '.join('%d:%.0f' % (x, p[x]) for x in range(max(0, g - 8), g + 5)))
        print('   droite  ' + ' '.join('%d:%.0f' % (x, p[x]) for x in range(d - 4, min(im.width, d + 9))))
        print()


if __name__ == '__main__':
    main()
