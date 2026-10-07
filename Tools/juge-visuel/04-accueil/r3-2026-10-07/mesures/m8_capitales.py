#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m8 — HAUTEUR DE CAPITALE et chasse des textes de LA SUITE (ce que l oeil voit).
Bandes repérées au profil d encre (x 150..370 pour les textes cales a gauche, x 380..700 pour
« LA SUITE » qui est centre). La capitale se mesure sur le PREMIER glyphe de la ligne, qui est
un « L » (« Le labo », « LA SUITE ») ou un « P »/« U »/« B » — tous sans jambage.
Intention CSS : titre 11 px CSS DejaVu Serif · corps 8,4 px CSS DejaVu Sans · LA SUITE 6,6 px CSS.
Controle positif : la CHASSE totale de la chaine identique « Le labo attend du Pyralin » doit
etre du meme ordre dans les deux images si l echelle est bien 1:1 (meme texte, meme police
annoncee). Un ecart de chasse a hauteur egale = arbitrage de police, pas defaut de taille.
Controle negatif : une bande vide rend « aucune encre ».
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), [
        ('LA SUITE',                380, 700,  860,  890),
        ('titre 1 "Le labo..."',    150, 600,  940,  982),
        ('corps 1 "Sans lui..."',   150, 600, 1002, 1038),
        ('titre 2 "Personne..."',   150, 600, 1118, 1152),
        ('BANDE VIDE (ctrl neg.)',  150, 600, 1640, 1670),
    ]),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), [
        ('LA SUITE',                380, 700,  912,  942),
        ('titre 1 "Le labo..."',    150, 600,  970, 1010),
        ('corps 1 "Sans lui..."',   150, 600, 1018, 1048),
        ('titre 2 "Personne..."',   150, 600, 1108, 1140),
        ('BANDE VIDE (ctrl neg.)',  150, 600, 1400, 1430),
    ]),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), [
        ('LA SUITE',                380, 700, 1318, 1348),
        ('titre 1 "Le labo..."',    150, 600, 1376, 1416),
        ('corps 1 "Sans lui..."',   150, 600, 1424, 1454),
        ('titre 2 "Personne..."',   150, 600, 1514, 1546),
        ('BANDE VIDE (ctrl neg.)',  150, 600, 1806, 1836),
    ]),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def mesure(im, x0, x1, y0, y1):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    seuil = fond + 40
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if lum(px[x, y]) > seuil]
    if len(pts) < 20:
        return None
    xs = sorted(set(p[0] for p in pts))
    xmin, xmax = xs[0], xs[-1]
    # premier glyphe : colonnes contigues depuis xmin (tolerance 2 px de blanc)
    fin = xmin
    for x in xs:
        if x - fin > 2:
            break
        fin = x
    g = [p[1] for p in pts if xmin <= p[0] <= fin]
    return dict(xmin=xmin, xmax=xmax, chasse=xmax - xmin + 1,
                g0=fin, cap_haut=min(g), cap_bas=max(g), cap=max(g) - min(g) + 1,
                nink=len(pts), fond=fond)


def main():
    res = {}
    for k, (chemin, bandes) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        res[k] = {}
        for nom, x0, x1, y0, y1 in bandes:
            m = mesure(im, x0, x1, y0, y1)
            if not m:
                print('   %-24s AUCUNE ENCRE' % nom)
                continue
            res[k][nom] = m
            print('   %-24s capitale %3d px (%.1f CSS) · chasse %4d px · encre x %d..%d · 1er glyphe x %d..%d'
                  % (nom, m['cap'], m['cap'] / 3.6, m['chasse'], m['xmin'], m['xmax'], m['xmin'], m['g0']))
        print()
    print('=== COMPARAISON (px, echelle 1:1) ===')
    print('%-24s %>0s' % ('', ''))
    for nom in [b[0] for b in JEUX['REF'][1]]:
        if nom in res['REF'] and nom in res['C19']:
            a, b = res['REF'][nom], res['C19'][nom]
            print('   %-24s capitale  REF %3d  C19 %3d  delta %+d (%+.0f%%)   |  chasse REF %4d  C19 %4d  delta %+d (%+.0f%%)'
                  % (nom, a['cap'], b['cap'], b['cap'] - a['cap'], 100.0 * (b['cap'] - a['cap']) / a['cap'],
                     a['chasse'], b['chasse'], b['chasse'] - a['chasse'],
                     100.0 * (b['chasse'] - a['chasse']) / a['chasse']))


if __name__ == '__main__':
    main()
