#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m18 — verification des ECARTS ASSUMES du dossier + palette globale.
Assumes a verifier « rendus proprement » :
  (1) « LEGERE » en gris chaud eteint (dossier : reference (139,129,113))
  (2) 3e ligne de LA SUITE = la planque / BLANCHIR
  (3) fond = diorama peint du district, DE NUIT
  (4) chrome commun = maquette HUD v3.1
Controle positif : l encre de « Lt. … attend vos ordres » doit etre le jeton creme (234,224,200)
dans les DEUX images -> la sonde lit bien un libelle de la barre.
Controle negatif : une fenetre vide de la barre rend « aucune encre ».
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(qui=(90, 700, 1700, 1740), legere=(90, 400, 1745, 1780),
                 planque_titre=(150, 700, 1370, 1470), sous_barre=(60, 1020, 1840, 2000))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(qui=(90, 700, 1515, 1555), legere=(90, 400, 1558, 1590),
                 planque_titre=(150, 700, 1260, 1390), sous_barre=(60, 1020, 1645, 1800))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(qui=(90, 700, 1932, 1972), legere=(90, 400, 1975, 2010),
                 planque_titre=(150, 700, 1665, 1800), sous_barre=(60, 1020, 2115, 2280))),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def encre(im, x0, x1, y0, y1, d=40):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if lum(px[x, y]) > fond + d]
    if len(pts) < 20:
        return None
    pts.sort(key=lambda p: -lum(px[p[0], p[1]]))
    noyau = pts[:max(1, len(pts) // 8)]
    ch = [[], [], []]
    for x, y in noyau:
        q = px[x, y]
        for i in range(3):
            ch[i].append(q[i])
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return tuple(sorted(c)[len(c) // 2] for c in ch), (min(xs), max(xs), min(ys), max(ys)), len(pts), fond


def palette(im, y0, y1):
    q = im.crop((0, y0, im.width, y1)).resize((135, max(1, (y1 - y0) // 8))).quantize(colors=6)
    pal = q.getpalette()
    cnt = sorted(q.getcolors(), reverse=True)
    tot = sum(c for c, _ in cnt)
    return [(round(100.0 * c / tot, 1), tuple(pal[3 * i:3 * i + 3])) for c, i in cnt]


def main():
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        for nom in ('qui', 'legere', 'planque_titre'):
            r = encre(im, *z[nom])
            if not r:
                print('   %-14s AUCUNE ENCRE' % nom)
                continue
            coul, bb, n, fond = r
            print('   %-14s RGB %-16s · bbox x %4d..%4d y %4d..%4d · %4d px d encre'
                  % (nom, str(coul), bb[0], bb[1], bb[2], bb[3], n))
        y0, y1 = z['sous_barre'][2], z['sous_barre'][3]
        print('   PALETTE sous la barre TRANCHER (y %d..%d) : %s'
              % (y0, y1, ' · '.join('%.0f%% %s' % (p, c) for p, c in palette(im, y0, y1))))
        print('   PALETTE du DECOR peint (y %d..%d) : %s'
              % (160, y0 - 400, ' · '.join('%.0f%% %s' % (p, c) for p, c in palette(im, 160, max(200, y0 - 400)))))
        print()


if __name__ == '__main__':
    main()
