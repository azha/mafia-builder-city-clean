# -*- coding: utf-8 -*-
"""㊳ : hauteur de CAPITALE du titre (le « L » de « Le journal ») et du sous-titre."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png'))

def cap(im, nom, x0, x1, y0, y1):
    b = bbox_encre(im, x0, y0, x1, y1, seuil=110)
    print('  %-26s fenêtre x[%d,%d] y[%d,%d] → bbox %s  hauteur CAP = %d px' %
          (nom, x0, x1, y0, y1, b[:4], b[3] - b[1] + 1))
    return b[3] - b[1] + 1

# Le « L » est le glyphe le plus à gauche : on borne la fenêtre à ses 40 premiers px d’encre
hr = cap(ref, 'réf   « L » du titre', 298, 345, 480, 600)
hj = cap(c19, 'jeu   « L » du titre', 324, 372, 280, 400)
print('  Δ hauteur de capitale : %+d px (%.1f %%)' % (hj - hr, 100.0 * (hj - hr) / hr))

print()
# largeur totale du mot « Le journal »
br = bbox_encre(ref, 250, 480, 850, 600, seuil=110)
bj = bbox_encre(c19, 250, 280, 850, 400, seuil=110)
print('  réf  « Le journal » largeur = %d px' % (br[2] - br[0] + 1))
print('  jeu  « Le journal » largeur = %d px' % (bj[2] - bj[0] + 1))
print('  Δ largeur : %+d px (%.1f %%)' % ((bj[2]-bj[0]) - (br[2]-br[0]), 100.0*((bj[2]-bj[0])-(br[2]-br[0]))/(br[2]-br[0])))

print('\n— SOUS-TITRE —')
sr = bbox_encre(ref, 250, 585, 850, 615, seuil=70)
sj = bbox_encre(c19, 250, 395, 850, 425, seuil=70)
print('  réf bbox %s  hauteur %d  largeur %d' % (sr[:4], sr[3]-sr[1]+1, sr[2]-sr[0]+1))
print('  jeu bbox %s  hauteur %d  largeur %d' % (sj[:4], sj[3]-sj[1]+1, sj[2]-sj[0]+1))
