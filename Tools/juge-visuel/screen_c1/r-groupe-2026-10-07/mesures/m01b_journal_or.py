# -*- coding: utf-8 -*-
"""㊳ : où y a-t-il de l'OR ? (lignes dont ≥20 % des pixels sont dorés) + géométrie du CTA."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
def est_or(p):
    return p[0] > 120 and p[1] > 85 and p[2] < p[0] * 0.75 and p[0] - p[2] > 40

def lignes_or(im, nom, seuil=0.20):
    w, h = im.size
    print('  %s (%dx%d) — lignes à ≥%d%% d’or :' % (nom, w, h, seuil * 100))
    runs, cur = [], None
    for y in range(h):
        px = list(im.crop((0, y, w, y + 1)).getdata())
        f = sum(1 for p in px if est_or(p)) / w
        if f >= seuil:
            if cur is None: cur = [y, y, f]
            else: cur[1] = y; cur[2] = max(cur[2], f)
        else:
            if cur: runs.append(tuple(cur)); cur = None
    if cur: runs.append(tuple(cur))
    for a, b, f in runs:
        print('     y %4d..%-4d  (%d px)  max %.0f%%' % (a, b, b - a + 1, f * 100))
    if not runs: print('     aucune')

print('IMAGES'); 
ref = ouvrir(os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png'))
print()
lignes_or(ref, 'RÉFÉRENCE cadre 125')
print()
lignes_or(c19, 'JEU 1080x1920')

print('\n— CTA du jeu : bords détectés par saut de luminance sur la ligne y=1495 —')
prof = profil_colonnes(c19, 1470, 1520, 60, 1030)
base = sorted(v for _, v in prof)[len(prof) // 2]
for x, v in prof:
    if v > base + 4 and (x < 200 or x > 900):
        print('   x=%d  lum=%.1f (fond %.1f)' % (x, v, base))
