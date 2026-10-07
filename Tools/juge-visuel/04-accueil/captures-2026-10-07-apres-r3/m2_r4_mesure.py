#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m2 — le FOND PEINT : luminance et teinte du diorama, par bandes.
Controle positif : la bande du BANDEAU (y 0..140) doit etre quasi identique entre ref et
captures (meme chrome, meme plaque sombre) -> si elle l'est, l'instrument lit bien les memes
grandeurs et un ecart sur une AUTRE bande n'est pas un biais d'instrument.
Controle negatif : la bande du PANNEAU (verre) doit etre sombre dans les deux -> si elle sortait
claire, c'est que je mesure autre chose.
"""
import os
from PIL import Image

BASE = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil'
IMG = {
    'REF': os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
    'C19': '/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/9aefe3f7-8c8f-4569-a473-faf5cc1280ef/scratchpad/parcours-12/p1_lancement_1080x1920.png',
    'C24': '/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/9aefe3f7-8c8f-4569-a473-faf5cc1280ef/scratchpad/parcours-12/p1_lancement_1080x2400.png',
}
# bandes exprimees en FRACTION de hauteur quand la zone est relative, en px quand elle est ancree
# au chrome (le bandeau est ancre en haut, le dock en bas).
ZONES = {
    # nom          : (image, y0, y1)  -- bornes mesurees au m1
    'REF': {'bandeau': (0, 138), 'fond_haut': (160, 430), 'fond_milieu': (430, 700),
            'fond_bas': (700, 820), 'verre_centre': (900, 1600), 'sous_trancher': (1840, 2020)},
    'C19': {'bandeau': (0, 138), 'fond_haut': (160, 430), 'fond_milieu': (430, 700),
            'fond_bas': (700, 878), 'verre_centre': (960, 1420), 'sous_trancher': (1645, 1830)},
    'C24': {'bandeau': (0, 138), 'fond_haut': (160, 430), 'fond_milieu': (430, 700),
            'fond_bas': (700, 1284), 'verre_centre': (1366, 1900), 'sous_trancher': (2113, 2300)},
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def stats(im, y0, y1, x0=0, x1=None):
    x1 = x1 if x1 is not None else im.width
    px = im.load()
    n = 0; L = 0.0; R = 0; G = 0; B = 0
    vals = []
    for y in range(y0, y1, 3):
        for x in range(x0, x1, 3):
            p = px[x, y]
            R += p[0]; G += p[1]; B += p[2]
            l = lum(p); L += l; vals.append(l); n += 1
    vals.sort()
    return dict(n=n, lum=L / n, med=vals[n // 2], p95=vals[int(n * .95)],
                rgb=(R // n, G // n, B // n))


def main():
    ims = {}
    for k, v in IMG.items():
        im = Image.open(v).convert('RGB')
        ims[k] = im
        print('LU %s %s %s' % (k, im.size, os.path.basename(v)))
    print()
    print('%-14s %-5s %8s %8s %8s   %s' % ('zone', 'img', 'lum.moy', 'mediane', 'p95', 'RGB moyen'))
    for zone in ('bandeau', 'fond_haut', 'fond_milieu', 'fond_bas', 'verre_centre', 'sous_trancher'):
        for k in ('REF', 'C19', 'C24'):
            y0, y1 = ZONES[k][zone]
            s = stats(ims[k], y0, y1)
            print('%-14s %-5s %8.1f %8.1f %8.1f   %s   (y %d..%d, n=%d)'
                  % (zone, k, s['lum'], s['med'], s['p95'], s['rgb'], y0, y1, s['n']))
        print()


if __name__ == '__main__':
    main()
