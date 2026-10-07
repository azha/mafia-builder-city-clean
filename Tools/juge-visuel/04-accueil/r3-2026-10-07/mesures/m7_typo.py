#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m7 — TYPOGRAPHIE de LA SUITE : hauteur de CAPITALE et couleur de l encre.
On mesure l ENCRE, pas une taille nominale : pour chaque bande de texte, la bbox des pixels
dont la luminance depasse (fond + 35), puis la hauteur de la lettre « L » de « Le labo » /
« Personne » (premiere colonne d encre, capitale sans jambage).
Intention CSS atelier : .t4 b = 11 px CSS 'DejaVu Serif' #f2c96b ; .t4 span = 8,4 px CSS
'DejaVu Sans' #b9ad92 ; .sur (LA SUITE) = 6,6 px CSS #b9ad92 ; a x3,6 : 39,6 / 30,2 / 23,8 px.
Controle positif : la hauteur de capitale de « LA SUITE » doit etre, dans la reference, proche de
0,73 x 23,8 = 17 px ; et les DEUX images doivent rendre un nombre du meme ordre si l echelle est
bien 1:1.
Controle negatif : la meme sonde lancee sur une bande SANS texte doit rendre « aucune encre ».
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), {
        'LA SUITE':        (380, 700, 930, 1000),
        'titre 1':         (150, 620, 1030, 1075),
        'corps 1':         (150, 620, 1075, 1120),
        'titre 2 (l.1)':   (150, 620, 1180, 1230),
        'corps 2 (l.1)':   (150, 620, 1265, 1310),
        'bande SANS texte':(150, 620, 1640, 1680),
    }),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), {
        'LA SUITE':        (380, 700, 955, 1000),
        'titre 1':         (150, 620, 1055, 1100),
        'corps 1':         (150, 620, 1105, 1145),
        'titre 2 (l.1)':   (150, 620, 1140, 1185),
        'corps 2 (l.1)':   (150, 620, 1185, 1225),
        'bande SANS texte':(150, 620, 1400, 1435),
    }),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def encre(im, x0, x1, y0, y1, dseuil=35):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    seuil = fond + dseuil
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if lum(px[x, y]) > seuil]
    if not pts:
        return None, fond, seuil, 0
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    # couleur de l encre : mediane des pixels les plus clairs (coeur du glyphe)
    pts.sort(key=lambda p: -lum(px[p[0], p[1]]))
    noyau = pts[:max(1, len(pts) // 10)]
    ch = [[], [], []]
    for x, y in noyau:
        p = px[x, y]
        for i in range(3):
            ch[i].append(p[i])
    coul = tuple(sorted(c)[len(c) // 2] for c in ch)
    return (min(xs), min(ys), max(xs), max(ys)), fond, seuil, len(pts), coul


def main():
    for k, (chemin, bandes) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        for nom, (x0, x1, y0, y1) in bandes.items():
            r = encre(im, x0, x1, y0, y1)
            if r[0] is None:
                print('   %-18s AUCUNE ENCRE (fond %.1f, seuil %.1f)' % (nom, r[1], r[2]))
                continue
            bb, fond, seuil, n, coul = r
            h = bb[3] - bb[1] + 1
            w = bb[2] - bb[0] + 1
            print('   %-18s encre x %4d..%4d (%3d px) · y %4d..%4d · HAUTEUR %3d px (%.1f px CSS)'
                  % (nom, bb[0], bb[2], w, bb[1], bb[3], h, h / 3.6))
            print('   %-18s   couleur du noyau RGB %-16s · %d px d encre · fond %.1f'
                  % ('', str(coul), n, fond))
        print()


if __name__ == '__main__':
    main()
