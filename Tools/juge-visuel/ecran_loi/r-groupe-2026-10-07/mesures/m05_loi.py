# -*- coding: utf-8 -*-
"""㉛ La loi — cartes d'option (bord d'état + pastille), bandeau de titre, bande basse,
et le fragment de titre coupé sur la planche défilée 1080x1920."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
r68 = ouvrir(os.path.join(JV, 'ecran_loi/r-groupe-2026-10-07/ref/cadre-68.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E05_Loi_1080x1920.png'))
b19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E05_Loi_bas_1080x1920.png'))

print('\n— CARTE « Commis d’office » : fond et BORD —')
print('   réf   fond   ', hexa(mediane_fenetre(r68, 300, 700, 600, 740)))
print('   réf   bord G ', hexa(mediane_fenetre(r68, 50, 700, 54, 760)))
print('   réf   bord H ', hexa(mediane_fenetre(r68, 300, 690, 700, 693)))
print('   jeu   fond   ', hexa(mediane_fenetre(c19, 300, 700, 600, 760)))
print('   jeu   bord G ', hexa(mediane_fenetre(c19, 59, 700, 63, 780)))
print('   jeu   bord H ', hexa(mediane_fenetre(c19, 300, 670, 700, 674)))

print('\n— CARTE « La filière » : fond et BORD (canon : or/brun) —')
print('   réf   fond   ', hexa(mediane_fenetre(r68, 300, 1000, 600, 1040)))
print('   réf   bord G ', hexa(mediane_fenetre(r68, 50, 1000, 54, 1060)))
print('   jeu   fond   ', hexa(mediane_fenetre(c19, 300, 1070, 600, 1120)))
print('   jeu   bord G ', hexa(mediane_fenetre(c19, 59, 1050, 63, 1130)))

print('\n— PASTILLES d’état : la référence les ENCADRE (border 1px currentColor) —')
def pastille(im, box, nom):
    b = bbox_encre(im, *box, seuil=90)
    print('   %-10s encre %s  (l=%d h=%d)' % (nom, b[:4], b[2]-b[0]+1, b[3]-b[1]+1))
pastille(r68, (760, 690, 1000, 790), 'réf EN PLACE')
pastille(c19, (800, 690, 1040, 760), 'jeu EN PLACE')
print('   réf  couleur du texte EN PLACE :', hexa(mediane_fenetre(r68, 820, 745, 900, 752)))
print('   jeu  couleur du texte EN PLACE :', hexa(mediane_fenetre(c19, 860, 725, 960, 735)))

print('\n— BANDE BASSE (.bas #141a21, filet haut 2 px #2c3640) et .geste —')
print('   réf   fond bande ', hexa(mediane_fenetre(r68, 300, 1790, 700, 1830)))
print('   réf   CTA fond   ', hexa(mediane_fenetre(r68, 300, 1930, 700, 1970)))
print('   réf   CTA bord G ', hexa(mediane_fenetre(r68, 50, 1900, 54, 1990)))
print('   jeu   fond bande ', hexa(mediane_fenetre(c19, 300, 1430, 700, 1460)))
print('   jeu   CTA fond   ', hexa(mediane_fenetre(c19, 300, 1540, 700, 1580)))
print('   jeu   CTA bord G ', hexa(mediane_fenetre(c19, 48, 1500, 52, 1600)))

print('\n— BANDEAU DE TITRE (.entete : fond #0f141b…, filet bas 1 px) —')
for y in (430, 500, 560, 580):
    print('   réf  y%4d %s' % (y, hexa(mediane_fenetre(r68, 300, y, 800, y+5))))
for y in (250, 330, 430, 470):
    print('   jeu  y%4d %s' % (y, hexa(mediane_fenetre(c19, 300, y, 800, y+5))))

print('\n— PLANCHE DÉFILÉE 1080x1920 : fragment de titre coupé sous le chrome —')
b = bbox_encre(b19, 100, 200, 400, 265, seuil=90)
print('   encre trouvée entre y 200 et 265 :', b[:4], '→ %d px de large, %d de haut, %d px d’encre' % (b[2]-b[0]+1, b[3]-b[1]+1, b[4]) if b else 'aucune')
print('   (sur la planche NON défilée, même fenêtre :', bbox_encre(c19, 100, 200, 400, 265, seuil=90), ')')
