#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m21 — LE JETON PARTAGE : liseré du panneau, séparateurs de rangée, remplissage des boutons
secondaires, liseré de la barre TRANCHER. Un seul gris-ardoise les porte-t-il tous ?
Intention CSS atelier (quatre valeurs DISTINCTES, quatre roles) :
  .verre        border:1px solid #ffffff17
  .r4           border-top:1px solid #ffffff12
  .g4           background:#ffffff0a
  .suivant      border:1px solid #2a3648   -> (42,54,72)
Controle positif : la reference doit rendre QUATRE valeurs differentes (c est la gradation du
canon) ; si elle en rendait une seule, ma sonde lirait le meme pixel quatre fois.
Controle negatif : la meme mediane prise au CENTRE du verre doit rendre le fond, pas un liseré.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def medi(im, x0, x1, y0, y1):
    px = im.load()
    ch = [[], [], []]
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]
            for i in range(3):
                ch[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch)


JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(lisere_panneau=(46, 49, 1100, 1300), separateur=(300, 800, 1075, 1076),
                 bouton2_fond=(650, 950, 1170, 1180), lisere_trancher=(46, 49, 1700, 1800),
                 CTRLNEG_centre_du_verre=(500, 600, 1100, 1120))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(lisere_panneau=(47, 49, 1100, 1300), separateur=(300, 800, 1076, 1077),
                 bouton2_fond=(700, 950, 1125, 1135), lisere_trancher=(47, 49, 1520, 1600),
                 CTRLNEG_centre_du_verre=(500, 600, 1095, 1110))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(lisere_panneau=(47, 49, 1400, 1700), separateur=(300, 800, 1482, 1483),
                 bouton2_fond=(700, 950, 1530, 1540), lisere_trancher=(47, 49, 1940, 2020),
                 CTRLNEG_centre_du_verre=(500, 600, 1300, 1320))),
}

for k, (chemin, z) in JEUX.items():
    im = Image.open(chemin).convert('RGB')
    print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
    vus = []
    for nom, (x0, x1, y0, y1) in z.items():
        c = medi(im, x0, x1, y0, y1)
        print('   %-24s RGB %-16s lum %5.1f' % (nom, str(c), lum(c)))
        if not nom.startswith('CTRLNEG'):
            vus.append(c)
    print('   -> %d valeur(s) DISTINCTE(S) sur les 4 surfaces de verre' % len(set(vus)))
    print()
