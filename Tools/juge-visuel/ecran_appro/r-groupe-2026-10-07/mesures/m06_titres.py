# -*- coding: utf-8 -*-
"""Les 5 titres d'écran : famille (lue sur le dessin), couleur dominante, hauteur de capitale.
Canon commun des 5 maquettes : h3 = 700 12px 'DejaVu Serif', #f0dfc4 (sauf ㊳ : .enseigne b =
700 17px 'DejaVu Serif', #f2c96b, lettré .2em).
fc-match sur la machine de rendu : « DejaVu Serif » → DejaVuSerif.ttf · « DejaVu Sans » →
DejaVuSans.ttf ⇒ AUCUNE substitution : l'écart de famille n'est pas un artefact de rendu."""
import os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
P  = os.path.join(JV, 'planches-par-ecran-2026-10-07')
print('IMAGES')
jeux = [('㊳ Journal',      'E01_Journal_1080x1920.png',      (60, 290, 800, 360)),
        ('㉞ Carnet',       'E02_Carnet_bas_1080x1920.png',   (50, 285, 800, 350)),
        ('㉚ Appro',        'E03_Chanedappro_1080x1920.png',  (55, 290, 900, 360)),
        ('㉘ Distribution', 'E04_Distribution_1080x1920.png', (55, 290, 900, 355)),
        ('㉛ Loi',          'E05_Loi_1080x1920.png',          (55, 290, 900, 355))]
refs = [('㊳ cadre 125', 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png',          (280, 500, 800, 575)),
        ('㉞ cadre 85',  'carnet/r-groupe-2026-10-07/ref/cadre-85.png',              (45, 470, 800, 520)),
        ('㉚ cadre 48',  'ecran_appro/r-groupe-2026-10-07/ref/cadre-48.png',         (45, 470, 950, 520)),
        ('㉘ cadre 54',  'ecran_distribution/r-groupe-2026-10-07/ref/cadre-54.png',  (45, 470, 950, 520)),
        ('㉛ cadre 68',  'ecran_loi/r-groupe-2026-10-07/ref/cadre-68.png',           (45, 470, 950, 520))]

def fiche(nom, im, box):
    px = [p for p in im.crop(box).getdata() if sum(p) > 300]
    c = collections.Counter(px).most_common(1)[0][0] if px else None
    b = bbox_encre(im, box[0], box[1], box[0] + 70, box[3], seuil=110)
    print('   %-16s couleur %s  1re capitale : %d px de haut' %
          (nom, hexa(c), (b[3] - b[1] + 1) if b else -1))

print('\nRÉFÉRENCES')
for n, f, box in refs:
    fiche(n, ouvrir(os.path.join(JV, f)), box)
print('\nJEU (1080x1920)')
for n, f, box in jeux:
    fiche(n, ouvrir(os.path.join(P, f)), box)
