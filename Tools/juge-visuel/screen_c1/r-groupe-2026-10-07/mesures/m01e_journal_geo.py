# -*- coding: utf-8 -*-
"""㊳ : géométrie horizontale (gouttières, plaques, compteurs) — contrôle positif d'échelle."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png'))

def bords(im, y0, y1, nom, seuil=4):
    """Colonnes où la luminance dépasse le fond de `seuil` — les bords d'une plaque."""
    prof = profil_colonnes(im, y0, y1, 0, 1080)
    base = min(v for _, v in prof)
    xs = [x for x, v in prof if v > base + seuil]
    print('  %-34s x %d..%d  (largeur %d)  fond=%.1f' % (nom, xs[0], xs[-1], xs[-1]-xs[0]+1, base))
    return xs[0], xs[-1]

print('\n— plaque du titre (enseigne) —')
a = bords(ref, 470, 630, 'réf')
b = bords(c19, 280, 440, 'jeu')
print('    Δ gauche %+d px · Δ droite %+d px · Δ largeur %+d px' % (b[0]-a[0], b[1]-a[1], (b[1]-b[0])-(a[1]-a[0])))

print('\n— rangée des compteurs —')
a = bords(ref, 660, 745, 'réf')
b = bords(c19, 480, 640, 'jeu')
print('    Δ gauche %+d px · Δ droite %+d px · Δ largeur %+d px' % (b[0]-a[0], b[1]-a[1], (b[1]-b[0])-(a[1]-a[0])))

print('\n— CTA —')
a = bords(ref, 1900, 1995, 'réf')
b = bords(c19, 1455, 1530, 'jeu')
print('    Δ gauche %+d px · Δ droite %+d px · Δ largeur %+d px' % (b[0]-a[0], b[1]-a[1], (b[1]-b[0])-(a[1]-a[0])))
