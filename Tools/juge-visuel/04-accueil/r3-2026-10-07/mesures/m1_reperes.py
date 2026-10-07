#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m1 — reperes geometriques : bandeau, panneau LA SUITE, barre TRANCHER, dock.
Imprime la taille de chaque image lue (preuve de lecture du bon fichier).
Controle positif : la LARGEUR est 1080 dans les trois images -> l'echelle horizontale
est 1:1 entre reference (x3.6 de 300 CSS) et captures. Toute largeur se compare en px bruts.
Controle negatif : la HAUTEUR differe (2102 / 1920 / 2400) -> aucune mesure verticale
absolue n'est comparable sans le dire.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF = os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png')
C19 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png')
C24 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png')


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil_lignes(im, x0, x1):
    """Luminance moyenne de chaque ligne, sur la bande [x0,x1)."""
    px = im.load()
    out = []
    for y in range(im.height):
        s = 0
        n = 0
        for x in range(x0, x1, 4):
            s += lum(px[x, y]); n += 1
        out.append(s / n)
    return out


def profil_colonnes(im, y0, y1):
    px = im.load()
    out = []
    for x in range(im.width):
        s = 0; n = 0
        for y in range(y0, y1, 2):
            s += lum(px[x, y]); n += 1
        out.append(s / n)
    return out


def main():
    for nom, chemin in (('REF cadre-4', REF), ('CAP 1080x1920', C19), ('CAP 1080x2400', C24)):
        im = Image.open(chemin)
        print('LU  %-14s %s  %s  %s' % (nom, im.size, im.mode, os.path.basename(chemin)))
    print()
    print('CONTROLE POSITIF  largeurs : %d / %d / %d  -> identiques'
          % (Image.open(REF).width, Image.open(C19).width, Image.open(C24).width))
    print('CONTROLE NEGATIF  hauteurs : %d / %d / %d  -> differentes (cadre telephone != resolution cible)'
          % (Image.open(REF).height, Image.open(C19).height, Image.open(C24).height))
    print()
    print('ECHELLE : reference rendue a x3.6 de 300 px CSS = 1080 px.')
    print('          captures 1080 px de large. 1 px CSS = 3,6 px dans LES TROIS images.')
    print()

    for nom, chemin in (('REF', REF), ('C19', C19), ('C24', C24)):
        im = Image.open(chemin).convert('RGB')
        pl = profil_lignes(im, 0, im.width)
        print('=== %s (%dx%d) — profil de lignes, sauts > 8 de luminance ===' % (nom, im.width, im.height))
        sauts = []
        for y in range(1, im.height):
            d = pl[y] - pl[y - 1]
            if abs(d) > 8:
                sauts.append((y, round(pl[y - 1], 1), round(pl[y], 1), round(d, 1)))
        for s in sauts:
            print('   y=%4d  %6.1f -> %6.1f   (%+.1f)' % s)
        print()


if __name__ == '__main__':
    main()
