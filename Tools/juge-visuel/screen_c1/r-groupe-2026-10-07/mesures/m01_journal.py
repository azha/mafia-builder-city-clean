# -*- coding: utf-8 -*-
"""Mesures ㊳ Journal — référence cadre 125 vs planches 1080x1920 / 1080x2400."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
REF = os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png')
C19 = os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png')
C24 = os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x2400.png')

print('IMAGES')
ref, c19, c24 = ouvrir(REF), ouvrir(C19), ouvrir(C24)

print('\n— TITRE « Le journal » (encre, seuil 100) —')
for nom, im, bande in (('ref', ref, (60, 460, 1020, 600)), ('cap1920', c19, (60, 280, 1020, 400)),
                       ('cap2400', c24, (60, 270, 1020, 370))):
    b = bbox_encre(im, *bande, seuil=100)
    print('  %-8s bbox=%s  hauteur=%s  largeur=%s' % (nom, b[:4], b[3] - b[1] + 1, b[2] - b[0] + 1))

print('\n— SOUS-TITRE (ligne capitales sous le titre) —')
for nom, im, bande in (('ref', ref, (60, 580, 1020, 630)), ('cap1920', c19, (60, 400, 1020, 440)),
                       ('cap2400', c24, (60, 370, 1020, 410))):
    b = bbox_encre(im, *bande, seuil=70)
    print('  %-8s bbox=%s  hauteur=%s' % (nom, b[:4] if b else None, (b[3] - b[1] + 1) if b else None))

print('\n— COULEURS D’APLAT (médiane de fenêtre, ≥3 px de tout bord) —')
ech = [
    ('fond d’écran',            ref, (500, 1600, 560, 1650), c19, (500, 1700, 560, 1740)),
    ('plaque du titre',         ref, (120, 480, 240, 560),   c19, (120, 300, 240, 380)),
    ('plaque d’un compteur',    ref, (120, 690, 200, 730),   c19, (120, 520, 200, 560)),
]
for nom, a, ba, b, bb in ech:
    ca, cb = mediane_fenetre(a, *ba), mediane_fenetre(b, *bb)
    print('  %-24s ref %s %-9s  jeu %s %-9s  Δmax=%d' % (nom, ca, hexa(ca), cb, hexa(cb), dhex(ca, cb)))

print('\n— OR DU TITRE (pixel le plus clair de l’encre) —')
def plus_clair(im, box):
    px = list(im.crop(box).getdata())
    return max(px, key=lambda p: 0.299*p[0]+0.587*p[1]+0.114*p[2])
print('  ref      %s %s' % (plus_clair(ref, (280, 470, 760, 560)), hexa(plus_clair(ref, (280, 470, 760, 560)))))
print('  cap1920  %s %s' % (plus_clair(c19, (320, 290, 770, 370)), hexa(plus_clair(c19, (320, 290, 770, 370)))))

print('\n— CTA (ㇽ « Y PRÊTER ATTENTION ») —')
# ref : CTA or plein ; cap : éteint attendu (.cta6.eteint : bord #2a3648, texte #7a838d, fond #111823)
print('  ref   fond   ', hexa(mediane_fenetre(ref, 200, 1880, 300, 1910)))
print('  ref   bord G ', hexa(mediane_fenetre(ref, 50, 1880, 54, 1910)))
print('  ref   texte  ', hexa(plus_clair(ref, (330, 1875, 740, 1915))))
print('  cap19 fond   ', hexa(mediane_fenetre(c19, 200, 1460, 300, 1490)))
print('  cap19 bord G ', hexa(mediane_fenetre(c19, 95, 1460, 99, 1490)))
print('  cap19 texte  ', hexa(plus_clair(c19, (330, 1465, 740, 1505))))
print('  .cta6.eteint attendu : bord #2a3648 · texte #7a838d · fond #111823')

print('\n— CONTRASTES texte/fond —')
print('  ref  titre or sur plaque   %.2f:1' % contraste(plus_clair(ref, (280, 470, 760, 560)), mediane_fenetre(ref, 120, 480, 240, 560)))
print('  jeu  titre or sur plaque   %.2f:1' % contraste(plus_clair(c19, (320, 290, 770, 370)), mediane_fenetre(c19, 120, 300, 240, 380)))
