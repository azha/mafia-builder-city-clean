#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m16 — RYTHME VERTICAL : bas du panneau, boite de la barre TRANCHER, gouttieres.
La boite de la barre TRANCHER se lit par la MEDIANE DE COLONNE sur sa bande (insensible au texte),
comme au m5b pour le panneau ; ses bords haut/bas par la mediane de LIGNE sur x 150..900.
Intention CSS : .verre{margin-bottom:10px} · .suivant{margin:0 12px 10px} -> gouttiere verre/
suivant = 10 px CSS = 36 px ; marges laterales identiques (12 px CSS = 43 px) pour les deux.
Controle positif : les marges laterales de la barre TRANCHER doivent EGALER celles du panneau
(meme valeur CSS) dans chaque image prise isolement.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 828, (1640, 1860)),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 886, (1440, 1680)),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1292, (1860, 2100)),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med_lignes(im, y0, y1, x0=150, x1=900):
    px = im.load()
    return {y: sorted(lum(px[x, y]) for x in range(x0, x1, 3))[(x1 - x0) // 6]
            for y in range(y0, y1)}


def med_cols(im, y0, y1):
    px = im.load()
    return [sorted(lum(px[x, y]) for y in range(y0, y1, 2))[(y1 - y0) // 4] for x in range(im.width)]


def main():
    for k, (chemin, ytop, (tb0, tb1)) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        # bas du panneau : derniere ligne dont la mediane est « verre »
        ml = med_lignes(im, ytop, tb1)
        verre = sorted(ml[y] for y in range(ytop + 40, ytop + 200))[80]
        bas = ytop
        for y in range(ytop + 40, tb1):
            if ml[y] < verre + 14:
                bas = y
        print('   PANNEAU : haut %d · bas %d · HAUTEUR %d px (%.1f%% de l ecran) · mediane du verre %.1f'
              % (ytop, bas, bas - ytop + 1, 100.0 * (bas - ytop + 1) / im.height, verre))
        # barre TRANCHER : bandes
        mc = med_cols(im, tb0, tb1)
        base = sorted(mc[300:800])[250]
        s = base + 14
        g = 540
        while g > 0 and mc[g - 1] <= s:
            g -= 1
        d = 540
        while d < im.width - 1 and mc[d + 1] <= s:
            d += 1
        print('   BARRE TRANCHER (mediane de colonne, bande y %d..%d) : x %d..%d · largeur %d px · marges %d / %d'
              % (tb0, tb1, g, d, d - g + 1, g, im.width - 1 - d))
        # bords haut/bas de la barre
        ml2 = med_lignes(im, tb0, tb1, 150, 900)
        fondbarre = sorted(ml2.values())[10]
        dedans = [y for y in range(tb0, tb1) if ml2[y] < fondbarre + 30]
        if dedans:
            # plus longue plage continue
            pl = []; a = dedans[0]; p = dedans[0]
            for y in dedans[1:]:
                if y - p > 3:
                    pl.append((a, p)); a = y
                p = y
            pl.append((a, p))
            pl.sort(key=lambda t: t[1] - t[0])
            a, b = pl[-1]
            print('   BARRE TRANCHER : haut %d · bas %d · HAUTEUR %d px · gouttiere panneau->barre %d px'
                  % (a, b, b - a + 1, a - bas))
        print()


if __name__ == '__main__':
    main()
