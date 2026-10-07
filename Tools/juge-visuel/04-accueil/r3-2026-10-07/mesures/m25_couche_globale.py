#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m25 — couche GLOBALE : luminance moyenne, part de pixels clairs, palette quantifiee,
et rang du bouton OR dans le classement des zones claires (= l ordre de lecture).
Controle positif : la somme des parts de la palette doit faire 100,0 %.
Controle negatif : la part de pixels tres clairs (L>=200) doit rester faible partout (< 2 %) —
aucune des trois images n est une image claire ; si elle sortait a 30 %, la sonde serait fausse.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = [('REF', os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), (651, 979, 945, 1037)),
       ('C19', os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), (661, 984, 968, 1052)),
       ('C24', os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), (661, 984, 1374, 1458))]


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def main():
    for k, chemin, orb in IMG:
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        vals = [lum(px[x, y]) for y in range(0, im.height, 4) for x in range(0, im.width, 4)]
        n = float(len(vals))
        print('   luminance moyenne %.1f · L>=90 : %.1f %% · L>=140 : %.1f %% · L>=200 : %.2f %% (controle negatif)'
              % (sum(vals) / n, 100 * sum(1 for v in vals if v >= 90) / n,
                 100 * sum(1 for v in vals if v >= 140) / n,
                 100 * sum(1 for v in vals if v >= 200) / n))
        q = im.resize((135, im.height // 8)).quantize(colors=6)
        pal = q.getpalette()
        cnt = sorted(q.getcolors(), reverse=True)
        tot = sum(c for c, _ in cnt)
        parts = [(100.0 * c / tot, tuple(pal[3 * i:3 * i + 3])) for c, i in cnt]
        print('   palette : %s   (somme %.1f %%)'
              % (' · '.join('%.1f%% %s' % p for p in parts), sum(p[0] for p in parts)))
        # rang du bouton or
        blocs = []
        for by in range(0, im.height - 90, 45):
            for bx in range(0, im.width - 90, 45):
                s = sum(lum(px[x, y]) for y in range(by, by + 90, 6) for x in range(bx, bx + 90, 6))
                blocs.append((s / 225.0, bx, by))
        blocs.sort(reverse=True)
        bx0, bx1, by0, by1 = orb
        rang = next((i + 1 for i, b in enumerate(blocs)
                     if bx0 - 45 <= b[1] <= bx1 and by0 - 45 <= b[2] <= by1), None)
        print('   RANG du bouton OR parmi les blocs 90x90 les plus clairs de l ecran : %s / %d'
              % (rang, len(blocs)))
        print('      les 5 blocs les plus clairs : %s'
              % ' · '.join('(%d,%d)=%.0f' % (b[1], b[2], b[0]) for b in blocs[:5]))
        print()


if __name__ == '__main__':
    main()
