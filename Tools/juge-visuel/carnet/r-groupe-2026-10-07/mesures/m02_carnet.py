# -*- coding: utf-8 -*-
"""㉞ Carnet — papier réglé, pastilles de rang, fond chaud, bande basse."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'carnet/r-groupe-2026-10-07/ref/cadre-85.png'))
c24 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E02_Carnet_1080x2400.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E02_Carnet_bas_1080x1920.png'))

print('\n— FOND DE L’ÉCRAN (canon .carn6 : dégradé chaud #1e1c19 → #131211) —')
print('   réf   haut  ', hexa(mediane_fenetre(ref, 20, 470, 40, 520)), ' bas ', hexa(mediane_fenetre(ref, 20, 1560, 40, 1620)))
print('   jeu24 haut  ', hexa(mediane_fenetre(c24, 10, 230, 30, 290)), ' bas ', hexa(mediane_fenetre(c24, 10, 1760, 30, 1820)))
print('   jeu19 haut  ', hexa(mediane_fenetre(c19, 10, 280, 30, 340)), ' bas ', hexa(mediane_fenetre(c19, 10, 1450, 30, 1500)))

print('\n— PAPIER (canon .cn-page : #efe7d6 + lignes réglées #cbbfa4 toutes les 25 px CSS = 90 px) —')
print('   réf   médiane du papier  ', hexa(mediane_fenetre(ref, 600, 1500, 900, 1540)))
print('   jeu24 médiane du papier  ', hexa(mediane_fenetre(c24, 600, 1400, 900, 1440)))
print('   #efe7d6 attendu')

def lignes_reglees(im, x0, x1, y0, y1, nom):
    """Compte les lignes sombres (réglure) à l'intérieur du papier."""
    prof = profil_lignes(im, x0, x1, y0, y1)
    base = sorted(v for _, v in prof)[int(len(prof) * 0.8)]
    creux = [(y, v) for y, v in prof if v < base - 6]
    # regroupe en traits
    traits, cur = [], None
    for y, v in creux:
        if cur and y == cur[1] + 1: cur[1] = y
        else:
            if cur: traits.append(tuple(cur))
            cur = [y, y]
    if cur: traits.append(tuple(cur))
    print('   %-10s base=%.1f  %d trait(s) de réglure : %s' % (nom, base, len(traits), traits[:12]))
    if len(traits) >= 2:
        pas = [traits[i+1][0] - traits[i][0] for i in range(len(traits)-1)]
        print('              pas entre traits : %s' % pas[:10])
    return traits

print('\n— RÉGLURE : traits sombres dans une colonne VIDE du papier (x 700..1000) —')
lignes_reglees(ref, 700, 1000, 1150, 1450, 'réf')
lignes_reglees(c24, 700, 1000, 1200, 1700, 'jeu24')

print('\n— PASTILLE DE RANG (.cn-slot .no : disque 15 px CSS = 54 px, fond #2a2118 / vide #cbbfa4) —')
b = bbox_encre(ref, 90, 1215, 180, 1270, seuil=0)   # le disque est SOMBRE sur papier clair : on mesure l’inverse
print('   réf   couleur au centre du rang 6 (vide) :', hexa(mediane_fenetre(ref, 140, 1230, 160, 1250)))
print('   réf   couleur au centre du rang 1 (plein):', hexa(mediane_fenetre(ref, 100, 770, 120, 790)))
print('   jeu24 même position (rang 1)             :', hexa(mediane_fenetre(c24, 95, 580, 125, 610)))
print('   jeu24 fond du papier à côté              :', hexa(mediane_fenetre(c24, 200, 580, 230, 610)))

print('\n— BANDE BASSE (.cn-bas : #141a21, bord haut 2 px #2c3640 ; .cn-geste or #d9ab4e) —')
print('   réf   fond de la bande  ', hexa(mediane_fenetre(ref, 300, 1790, 700, 1830)))
print('   réf   CTA bord          ', hexa(mediane_fenetre(ref, 55, 1950, 60, 1990)))
print('   jeu24 même zone         ', hexa(mediane_fenetre(c24, 300, 2080, 700, 2120)))
