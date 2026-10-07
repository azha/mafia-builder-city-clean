#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m5 — marges laterales du panneau, par PROFIL DE COLONNES sur une bande SANS TEXTE
(juste sous le filet laiton du bord haut, au-dessus de « LA SUITE »).
Le bord se lit comme le dernier changement brusque avant la plage plate du centre.
Controle positif : la largeur du panneau doit valoir, sur la REFERENCE, 300-2x12 = 276 px CSS
= 994 px a x3,6. Si l instrument rend ca sur la reference, il mesure bien un panneau.
Controle negatif : la meme mesure prise 300 px plus bas (DANS le texte) doit donner un resultat
DIFFERENT -> preuve que la bande choisie compte.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 832, 918),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 890, 955),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1296, 1360),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil(im, y0, y1):
    px = im.load()
    out = []
    for x in range(im.width):
        s = 0.0; n = 0
        for y in range(y0, y1):
            s += lum(px[x, y]); n += 1
        out.append(s / n)
    return out


def bords(p, centre=540):
    base = sorted(p[centre - 150:centre + 150])[150]   # mediane du centre : le verre
    seuil = base + 10
    g = centre
    while g > 0 and p[g - 1] <= seuil:
        g -= 1
    d = centre
    while d < len(p) - 1 and p[d + 1] <= seuil:
        d += 1
    return g, d, base


def main():
    for k, (chemin, y0, y1) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s   bande y %d..%d' % (k, im.size, os.path.basename(chemin), y0, y1))
        p = profil(im, y0, y1)
        g, d, base = bords(p)
        print('   verre (luminance mediane au centre) = %.1f' % base)
        print('   BORD GAUCHE x=%d   BORD DROIT x=%d   LARGEUR=%d   marges %d / %d'
              % (g, d, d - g + 1, g, im.width - 1 - d))
        print('   profil autour du bord gauche : ' +
              ' '.join('%d:%.0f' % (x, p[x]) for x in range(max(0, g - 6), g + 7)))
        print('   profil autour du bord droit  : ' +
              ' '.join('%d:%.0f' % (x, p[x]) for x in range(d - 6, min(im.width, d + 7))))
        # controle negatif : meme mesure 300 px plus bas (dans le texte)
        p2 = profil(im, y0 + 300, y1 + 300)
        g2, d2, b2 = bords(p2)
        print('   [controle negatif, bande y %d..%d dans le texte] -> gauche=%d droite=%d largeur=%d'
              % (y0 + 300, y1 + 300, g2, d2, d2 - g2 + 1))
        print()


if __name__ == '__main__':
    main()
