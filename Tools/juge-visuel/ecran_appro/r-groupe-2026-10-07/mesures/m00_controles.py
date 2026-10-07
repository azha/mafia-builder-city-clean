# -*- coding: utf-8 -*-
"""CONTRÔLE POSITIF commun aux 5 écrans : ce que l'instrument trouve ÉGAL entre maquette et jeu.
(Si tout sortait faux, c'est l'instrument qu'il faudrait soupçonner — cette section existe pour ça.)"""
import os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
P = os.path.join(JV, 'planches-par-ecran-2026-10-07')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'screen_c1/r-groupe-2026-10-07/ref/cadre-125.png'))
r68 = ouvrir(os.path.join(JV, 'ecran_loi/r-groupe-2026-10-07/ref/cadre-68.png'))
caps = {n: ouvrir(os.path.join(P, f)) for n, f in (
    ('㊳ 1920', 'E01_Journal_1080x1920.png'), ('㉞ 2400', 'E02_Carnet_1080x2400.png'),
    ('㉚ 1920', 'E03_Chanedappro_1080x1920.png'), ('㉘ 1920', 'E04_Distribution_1080x1920.png'),
    ('㉛ 1920', 'E05_Loi_1080x1920.png'))}

def clair(im, box):
    px = list(im.crop(box).getdata())
    return max(px, key=lambda p: 0.299*p[0]+0.587*p[1]+0.114*p[2])

print('\n1. OR de la valeur ARGENT du bandeau haut')
print('   réf (maquette .barre .val) ', hexa(clair(ref, (45, 75, 230, 120))))
for n, im in caps.items():
    y = 60 if im.size[1] == 1920 else 50
    print('   %-9s %s' % (n, hexa(clair(im, (45, y, 220, y+50)))))

print('\n2. Libellé CHALEUR du manomètre (crème)')
print('   réf ', hexa(clair(ref, (430, 165, 620, 190))))
for n, im in caps.items():
    y = 155 if im.size[1] == 1920 else 125
    print('   %-9s %s' % (n, hexa(clair(im, (420, y, 620, y+28)))))

print('\n3. Gouttière latérale du contenu (bord gauche du 1er bloc)')
print('   maquette : marge 13 px CSS × 3,6 = 46,8 px')
print('   ㊳ plaque du titre : x=46 (mesuré m01e)  → écart 0,8 px')

print('\n4. Jeton .geste rendu FIDÈLEMENT là où le client le pose (contrôle interne)')
print('   canon : bord #5a4a2a · fond #241c11 · texte #d9ab4e')
l = caps['㉛ 1920']
print('   ㉛ bord ', hexa(mediane_fenetre(l, 48, 1500, 52, 1600)), ' fond ', hexa(mediane_fenetre(l, 300, 1540, 700, 1580)))
a = caps['㉚ 1920']
print('   ㉚ bord ', hexa(mediane_fenetre(a, 59, 1390, 63, 1480)), ' fond ', hexa(mediane_fenetre(a, 300, 1400, 700, 1440)))
print('   réf ㉛ bord ', hexa(mediane_fenetre(r68, 50, 1905, 54, 1985)), ' fond ', hexa(mediane_fenetre(r68, 300, 1930, 700, 1970)))
print('   réf ㉛ texte ', hexa(collections.Counter([p for p in r68.crop((90,1920,560,1965)).getdata() if p[0]>150 and p[2]<140]).most_common(1)[0][0]))
print('   ㉛ texte jeu ', hexa(collections.Counter([p for p in l.crop((90,1510,470,1560)).getdata() if p[0]>150 and p[2]<140]).most_common(1)[0][0]))

print('\n5. Barre d’onglets du shell (absente des cadres : chrome d’application, pas un écart)')
for n, im in caps.items():
    h = im.size[1]
    print('   %-9s pastille « PLUS » soulignée en or : %s' % (n, hexa(clair(im, (795, h-130, 850, h-120)))))
