#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le menu « Plus » est-il visible SOUS un écran capturé via ce menu ? (fait `15a0da7` : depuis le 02/09 les
destinations se montaient PAR-DESSUS le menu sans le démonter.) Instrument : autocorrélation du profil de
luminance moyenne par ligne, dans la zone libre (y 160..2150), au PAS des bandes du menu (~122,6 px, mesuré
au r1 de ⑱). Contrôle positif : la planche du menu lui-même (⑱) ; contrôle négatif : une planche prise SANS
passer par le menu (⑥). Ne voit que des BANDES périodiques — un texte fantôme isolé lui échappe : il faut
le dire, pas le déduire.
Usage : python3 Tools/juge-visuel/mesurer-fantome-menu-plus.py <png>…
"""
import sys
from PIL import Image
def profil(p, y0=160, y1=2150):
    im = Image.open(p).convert('L'); w, h = im.size; px = im.load(); xs = range(40, w - 40, 6)
    print(f'{p}: {im.size}')
    return [sum(px[x, y] for x in xs) / len(xs) for y in range(y0, min(y1, h))]
def autocorr(v, lag):
    m = sum(v) / len(v); v = [a - m for a in v]; n = len(v) - lag
    num = sum(v[i] * v[i + lag] for i in range(n)); den = sum(a * a for a in v)
    return num / den if den else 0.0
temoins = {'positif (⑱ menu)': 'Tools/juge-visuel/plus/r1-2026-09-06/capture-1080x2400.png',
           'négatif (⑥ sans menu)': 'Tools/juge-visuel/famille/r1-2026-09-06/capture-1080x2400.png'}
seuil = None
for k, p in temoins.items():
    a = autocorr(profil(p), 123); print(f'  témoin {k}: autocorr@123 = {a:+.3f}')
    seuil = a if seuil is None else seuil
for p in sys.argv[1:]:
    v = profil(p); a = autocorr(v, 123); best = max(range(100, 150), key=lambda l: autocorr(v, l))
    print(f'  {p}: autocorr@123 = {a:+.3f} · meilleur lag 100-150 = {best} ({autocorr(v, best):+.3f}) → '
          + ('BANDES DU MENU VISIBLES' if a > 0.6 else 'pas de bandes périodiques du menu (texte fantôme isolé : non testé)'))
