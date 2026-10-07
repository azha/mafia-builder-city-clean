# -*- coding: utf-8 -*-
"""㉘ Distribution — le geste, le titre, le bandeau. (L'état en jeu — « pas encore de relais » —
n'a AUCUN cadre dans la maquette : seuls le chrome, la typographie et le jeton d'action sont
comparables.)"""
import os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'ecran_distribution/r-groupe-2026-10-07/ref/cadre-54.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E04_Distribution_1080x1920.png'))

print('\n— LE GESTE (canon .lieg6 .geste : bord #5a4a2a, fond #241c11, texte #d9ab4e, MAJUSCULES, note à droite) —')
print('   réf   fond     ', hexa(mediane_fenetre(ref, 300, 1930, 700, 1970)))
print('   réf   bord G   ', hexa(mediane_fenetre(ref, 51, 1900, 55, 1990)))
def dom(im, box, nom, fond):
    px=[p for p in im.crop(box).getdata() if dhex(p, fond) > 40]
    if not px: print('   %s : rien'%nom); return None
    c=collections.Counter(px).most_common(1)[0][0]
    print('   %-16s %s %s  contraste/fond %.2f:1' % (nom, c, hexa(c), contraste(c, fond)))
    return c
dom(ref,(85,1890,470,1930),'réf texte', (0x24,0x1c,0x11))
print('   jeu   fond     ', hexa(mediane_fenetre(c19, 300, 930, 700, 975)))
print('   jeu   bord G   ', hexa(mediane_fenetre(c19, 60, 915, 64, 1000)))
print('   jeu   bord H   ', hexa(mediane_fenetre(c19, 300, 908, 700, 912)))
dom(c19,(90,930,420,975),'jeu texte', (0x2a,0x31,0x3c))

print('\n— TITRE : famille, couleur, hauteur de capitale —')
b = bbox_encre(ref, 45, 470, 110, 520, seuil=110); print('   réf   « L » bbox %s  hauteur %d' % (b[:4], b[3]-b[1]+1))
print('   réf   couleur du titre', hexa(collections.Counter([p for p in ref.crop((48,470,800,520)).getdata() if sum(p)>330]).most_common(1)[0][0]))
b = bbox_encre(c19, 55, 285, 130, 360, seuil=110); print('   jeu   « P » bbox %s  hauteur %d' % (b[:4], b[3]-b[1]+1))
print('   jeu   couleur du titre', hexa(collections.Counter([p for p in c19.crop((58,285,900,355)).getdata() if sum(p)>330]).most_common(1)[0][0]))
print('   canon .lieg6 .entete h3 : 700 12px DejaVu SERIF, #f0dfc4')

print('\n— BANDEAU .entete (fond #20180f, filet bas 1 px #3d3024) —')
for y in (440, 500, 560, 580):
    print('   réf  y%4d %s' % (y, hexa(mediane_fenetre(ref, 300, y, 800, y+5))))
for y in (250, 330, 430, 470):
    print('   jeu  y%4d %s' % (y, hexa(mediane_fenetre(c19, 300, y, 800, y+5))))

print('\n— LIÈGE (.planche #8a6a42 + cadre bois #4a3722) : ce que la maquette met au centre —')
print('   réf   centre de la planche', hexa(mediane_fenetre(ref, 480, 980, 560, 1040)))
print('   jeu   même position       ', hexa(mediane_fenetre(c19, 480, 980, 560, 1040)))
