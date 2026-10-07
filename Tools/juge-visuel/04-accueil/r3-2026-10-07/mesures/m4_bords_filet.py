#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m4 — bords du panneau et filet laiton, par DETECTION DE COULEUR (pas par centile).
Deux instruments independants :
 (a) bord du panneau : la bordure 1 px #ffffff17 + la rupture de luminance entre le decor et le
     verre. On cherche, sur une ligne, la plus longue plage continue de pixels « sombres et plats »
     (ecart max 14 entre voisins a 6 px) encadrant le centre de l ecran.
 (b) filet laiton : pixels dont la teinte est LAITON (R>G>B, R-B > 35, R > 90).
Controle positif (a) : sur la REFERENCE la plage doit coller aux marges CSS 12 px x3,6 = 43 px.
Controle positif (b) : le filet du BANDEAU (barre::after, pleine largeur attendue) doit sortir
large dans les trois images ; s il sortait nul, mon detecteur de laiton serait faux.
Controle negatif (b) : une ligne PRISE DANS LE VERRE (sans filet) doit rendre 0 colonne laiton.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 828),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 886),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1292),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def est_laiton(p):
    r, g, b = p[:3]
    return r > 90 and r > g > b and (r - b) > 35


def filet_laiton(im, y):
    px = im.load()
    cols = [x for x in range(im.width) if est_laiton(px[x, y])]
    if not cols:
        return None
    # plus longue plage continue (tolerance 4 px de trou)
    plages = []
    deb = cols[0]; prec = cols[0]
    for x in cols[1:]:
        if x - prec > 4:
            plages.append((deb, prec)); deb = x
        prec = x
    plages.append((deb, prec))
    plages.sort(key=lambda t: t[1] - t[0])
    a, b = plages[-1]
    return a, b, b - a + 1, len(cols)


def bords_verre(im, y):
    """Plage sombre et plate contenant x=540."""
    px = im.load()
    L = [lum(px[x, y]) for x in range(im.width)]
    seuil = 42.0
    if L[540] > seuil:
        return None
    g = 540
    while g > 0 and L[g - 1] <= seuil:
        g -= 1
    d = 540
    while d < im.width - 1 and L[d + 1] <= seuil:
        d += 1
    return g, d


def main():
    ims = {}
    for k, (chemin, ytop) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        ims[k] = (im, ytop)
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
    print()

    print('=== (b) CONTROLE POSITIF — filet laiton du BANDEAU ===')
    for k, (im, _) in ims.items():
        for y in range(138, 150):
            f = filet_laiton(im, y)
            if f and f[2] > 300:
                print('   %s y=%4d  laiton x %4d..%4d  largeur %4d px (%.1f%%)'
                      % (k, y, f[0], f[1], f[2], 100.0 * f[2] / im.width))
                break
    print()
    print('=== (b) CONTROLE NEGATIF — une ligne DANS le verre, sans filet ===')
    for k, (im, ytop) in ims.items():
        y = ytop + 200
        f = filet_laiton(im, y)
        print('   %s y=%4d  -> %s' % (k, y, 'AUCUN laiton' if f is None else
                                      'laiton %d..%d (%d px) /// detecteur suspect' % f[:3]))
    print()
    print('=== (b) FILET LAITON DU BORD HAUT DU PANNEAU ===')
    print('   intention CSS (verre::after, x3,6) : x 94..986 = 893 px = 82,7 %')
    for k, (im, ytop) in ims.items():
        best = None
        for y in range(ytop - 8, ytop + 10):
            f = filet_laiton(im, y)
            if f and (best is None or f[2] > best[1][2]):
                best = (y, f)
        if best:
            y, f = best
            print('   %s  y=%4d  x %4d..%4d  largeur %4d px (%.1f%% ecran)  centre x=%.0f'
                  % (k, y, f[0], f[1], f[2], 100.0 * f[2] / im.width, (f[0] + f[1]) / 2.0))
        else:
            print('   %s  AUCUN filet laiton au bord haut du panneau' % k)
    print()
    print('=== (a) BORDS DU PANNEAU (plage sombre contenant x=540) ===')
    print('   intention CSS (marge 12 px x3,6) : gauche 43, droite 1036, largeur 994')
    for k, (im, ytop) in ims.items():
        for dy in (60, 100, 160):
            b = bords_verre(im, ytop + dy)
            if b:
                print('   %s  y=%4d  gauche=%4d droite=%4d  largeur=%4d  marges %d / %d'
                      % (k, ytop + dy, b[0], b[1], b[1] - b[0] + 1, b[0], im.width - 1 - b[1]))


if __name__ == '__main__':
    main()
