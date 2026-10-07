#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m24 — capitale du PREMIER glyphe du bandeau, quand les chaines DIFFERENT.
« Plein jour » / « Aube » et « 24 850 € » / « 10 000 € » ne sont pas les memes chaines : leurs
chasses ne se comparent pas, et leurs bbox d encre non plus (« Plein jour » a un jambage, pas
« Aube »). Seule la hauteur du PREMIER glyphe — « P » / « A », « 2 » / « 1 », tous sans jambage —
est comparable.
Controle : le premier glyphe est isole par contiguite de colonnes (tolerance 2 px de blanc).
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(phase=(830, 1050, 60, 120), montant=(44, 230, 60, 115))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(phase=(920, 1050, 50, 110), montant=(44, 230, 48, 105))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(phase=(920, 1050, 50, 110), montant=(44, 230, 48, 105))),
}

for k, (chemin, z) in JEUX.items():
    im = Image.open(chemin).convert('RGB')
    px = im.load()
    print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
    for nom, (x0, x1, y0, y1) in z.items():
        vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
        fond = vals[len(vals) // 4]
        cols = [x for x in range(x0, x1) if any(lum(px[x, y]) > fond + 45 for y in range(y0, y1))]
        if not cols:
            print('   %-8s AUCUNE ENCRE' % nom)
            continue
        fin = cols[0]
        for x in cols:
            if x - fin > 2:
                break
            fin = x
        rows = [y for y in range(y0, y1) if any(lum(px[x, y]) > fond + 45 for x in range(cols[0], fin + 1))]
        print('   %-8s 1er glyphe x %4d..%4d · y %3d..%3d · HAUTEUR %2d px'
              % (nom, cols[0], fin, rows[0], rows[-1], rows[-1] - rows[0] + 1))
    print()
