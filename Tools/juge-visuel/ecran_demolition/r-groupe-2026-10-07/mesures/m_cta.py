# -*- coding: utf-8 -*-
"""㉝ — géométrie du CTA. Repérage par la teinte DORÉE du cadre, seuil relâché : le fond de la
référence est un art peint, donc un repérage « par écart au fond dominant » y rend toute la
largeur (mesuré : (0,1079)) — c'est le mode d'échec que ce script évite."""
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
REF='/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs/'
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
dore = lambda r,g,b: r-b > 18 and r > 55          # laiton sombre inclus
def bords(im, y):
    px=im.load(); xs=[x for x in range(im.size[0]) if dore(*px[x,y])]
    return (min(xs), max(xs), len(xs)) if xs else None
r79=ouvrir(REF+'s6-79.png'); c24=ouvrir(CAP+'E06_Dmolition_1080x2400.png'); c19=ouvrir(CAP+'E06_Dmolition_1080x1920.png')
print('ligne dans le CADRE du CTA → (x min, x max, nb px dorés) :')
print('  ref 79    y=1941 (bord haut) :', bords(r79,1941))
print('  capt2400  y=1956 (bord haut) :', bords(c24,1956))
print('  capt1920  y=1476 (bord haut) :', bords(c19,1476))
print('CONTRÔLE NÉGATIF du même test : une ligne de fond nu')
print('  capt2400  y=1700 (vide)      :', bords(c24,1700))
print('hauteur du CTA : ref 105 px (y 1938..2042) · capture 144 px — le libellé passe à DEUX lignes')
