# -*- coding: utf-8 -*-
"""Couche globale : palette quantifiée (aire couverte) et luminance moyenne, réf vs jeu.
La zone comparée EXCLUT, côté jeu, le bandeau haut et la barre d'onglets (chrome d'application
que les cadres ne portent pas), et côté réf le décor de scène au-dessus du panneau."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
P  = os.path.join(JV, 'planches-par-ecran-2026-10-07')
paires = [
 ('㊳', 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png',         (0, 430, 1080, 2090), 'E01_Journal_1080x1920.png',      (0, 250, 1080, 1620)),
 ('㉞', 'carnet/r-groupe-2026-10-07/ref/cadre-85.png',             (0, 430, 1080, 2090), 'E02_Carnet_bas_1080x1920.png',   (0, 250, 1080, 1620)),
 ('㉚', 'ecran_appro/r-groupe-2026-10-07/ref/cadre-48.png',        (0, 430, 1080, 2090), 'E03_Chanedappro_1080x1920.png',  (0, 250, 1080, 1620)),
 ('㉘', 'ecran_distribution/r-groupe-2026-10-07/ref/cadre-54.png', (0, 430, 1080, 2090), 'E04_Distribution_1080x1920.png', (0, 250, 1080, 1620)),
 ('㉛', 'ecran_loi/r-groupe-2026-10-07/ref/cadre-68.png',          (0, 430, 1080, 2090), 'E05_Loi_1080x1920.png',          (0, 250, 1080, 1620)),
]
print('IMAGES')
for ic, fr, br, fj, bj in paires:
    r = ouvrir(os.path.join(JV, fr)).crop(br)
    j = ouvrir(os.path.join(P, fj)).crop(bj)
    def lm(im):
        g = im.convert('L').resize((108, 160))
        d = list(g.getdata()); return sum(d)/len(d)
    print('\n%s  réf %dx%d  jeu %dx%d   luminance moyenne : réf %.1f · jeu %.1f (Δ %+.1f)' %
          (ic, r.size[0], r.size[1], j.size[0], j.size[1], lm(r), lm(j), lm(j)-lm(r)))
    print('   réf :', ' '.join('%s %.0f%%' % (hexa(c), p) for c, p in palette(r, 5)))
    print('   jeu :', ' '.join('%s %.0f%%' % (hexa(c), p) for c, p in palette(j, 5)))
