#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m10 — SEPARATEURS de rangees, bas du panneau, barre TRANCHER, dock : geometrie et couleur.
Intention CSS atelier : .r4{border-top:1px solid #ffffff12 ; padding:9px 0} (pas de bord sur la
1re rangee) ; .verre{padding:12px 14px} ; .suivant{margin:0 12px 10px ; padding:8px 10px ;
border-radius:9px ; background:rgba(11,17,27,.86) ; border:1px solid #2a3648} ;
.dock9 .rd{35,2px CSS de diametre} ; .dock9{gap:16,8px CSS}.
Controle positif : les deux separateurs d une meme image doivent rendre la MEME couleur
(ils sont le meme objet repete) ; sinon la sonde lit autre chose.
Controle negatif : une ligne 20 px sous un separateur doit rendre le fond du verre.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            [1076, 1335], 828),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            [1076, 1234], 886),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            [1482, 1640], 1292),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def sep(im, yc):
    px = im.load()
    best = None
    for y in range(yc - 4, yc + 5):
        v = sum(lum(px[x, y]) for x in range(200, 900, 5)) / 140.0
        if best is None or v > best[1]:
            best = (y, v)
    y = best[0]
    fond = sum(lum(px[x, y + 14]) for x in range(200, 900, 5)) / 140.0
    xs = [x for x in range(52, 1029) if lum(px[x, y]) - lum(px[x, y + 14]) > 6]
    ch = [[], [], []]
    for x in range(300, 800, 3):
        p = px[x, y]
        for i in range(3):
            ch[i].append(p[i])
    coul = tuple(sorted(c)[len(c) // 2] for c in ch)
    # epaisseur : lignes consecutives au-dessus du fond+5
    ep = 0
    for yy in range(y - 4, y + 5):
        v = sum(lum(px[x, yy]) for x in range(300, 800, 5)) / 100.0
        if v > fond + 5:
            ep += 1
    return y, coul, lum(coul), fond, (xs[0], xs[-1], len(xs)) if xs else None, ep


def main():
    for k, (chemin, seps, ytop) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s   (haut du panneau y=%d)' % (k, im.size, os.path.basename(chemin), ytop))
        for i, yc in enumerate(seps, 1):
            y, coul, cl, fond, ext, ep = sep(im, yc)
            print('   separateur %d : y=%4d  RGB %-16s lum %5.1f  (verre %5.1f, ecart %+5.1f)  epaisseur %d px'
                  % (i, y, str(coul), cl, fond, cl - fond, ep))
            if ext:
                print('                  etendue x %4d..%4d = %3d px (%.1f%% du panneau 982 px)'
                      % (ext[0], ext[1], ext[1] - ext[0] + 1, 100.0 * (ext[1] - ext[0] + 1) / 982))
        print('   ecart entre separateurs : %d px' % (seps[1] - seps[0]))
        print()


if __name__ == '__main__':
    main()
