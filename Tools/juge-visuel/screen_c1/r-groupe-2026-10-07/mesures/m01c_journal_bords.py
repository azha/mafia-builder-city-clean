# -*- coding: utf-8 -*-
"""㊳ : les BORDS #2a3648 du canon existent-ils en jeu ? (compteurs, liste, cartes, CTA)

Contrôle positif : sur la RÉFÉRENCE, le même détecteur doit TROUVER le bord — s'il ne le trouve
pas là, c'est l'instrument qui est faux, pas le jeu.
Contrôle négatif : une bande de fond pur ne doit rien rendre.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
BORD = (0x2a, 0x36, 0x48)

def saut_horizontal(im, y0, y1, x, nom):
    """Couleur médiane d'une colonne de 3 px autour de x, sur la bande [y0,y1[."""
    c = mediane_fenetre(im, x - 1, y0, x + 2, y1)
    print('     %-34s x=%4d  %s %s   Δ(#2a3648)=%d' % (nom, x, c, hexa(c), dhex(c, BORD)))
    return c

print('IMAGES')
ref = ouvrir(os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E01_Journal_1080x1920.png'))

print('\n— RÉFÉRENCE (contrôle positif : le bord DOIT sortir) —')
# compteur gauche : plaque x≈50..345 (lu sur l’image), bande y 660..740
saut_horizontal(ref, 670, 740, 50, 'bord gauche du compteur 1')
saut_horizontal(ref, 670, 740, 344, 'bord droit du compteur 1')
saut_horizontal(ref, 1000, 1100, 80, 'bord gauche de la carte .une')
saut_horizontal(ref, 1600, 1700, 500, 'CONTRÔLE NÉGATIF : plein fond')

print('\n— JEU 1080x1920 —')
# compteurs : repérés à x 48..336 / 357..710 / 730..1034 (bande y 480..640)
for x, nom in ((48, 'bord gauche du compteur 1'), (336, 'bord droit du compteur 1'),
               (357, 'bord gauche du compteur 2'), (1034, 'bord droit du compteur 3')):
    saut_horizontal(c19, 500, 630, x, nom)
saut_horizontal(c19, 700, 850, 48, 'bord gauche de la 1re carte')
saut_horizontal(c19, 1700, 1750, 500, 'CONTRÔLE NÉGATIF : plein fond')
print('     CTA éteint, bord gauche :')
saut_horizontal(c19, 1460, 1520, 94, 'bord gauche du CTA')
saut_horizontal(c19, 1460, 1520, 985, 'bord droit du CTA')
print('     attendu .cta6.eteint : #2a3648')

print('\n— La règle d’or sous l’enseigne (border-bottom:2px #b08d3e) —')
print('     réf   y 640..646 : %s  (7 px à 3,6× = 2 px CSS)' % hexa(mediane_fenetre(ref, 300, 641, 700, 646)))
# en jeu l’enseigne finit vers y=452 (plaque 268..452)
for y in range(440, 470, 3):
    c = mediane_fenetre(c19, 300, y, 700, y + 2)
    print('     jeu   y %4d : %s %s' % (y, c, hexa(c)))
