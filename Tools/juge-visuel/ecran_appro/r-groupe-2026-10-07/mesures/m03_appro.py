# -*- coding: utf-8 -*-
"""㉚ Chaîne d'appro — titre (serif/corps), bandeau, bon de commande (filets pointillés,
perforation, rouge), bande basse."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *
JV = os.path.expanduser('~/project/mafia-builder-city-clean/Tools/juge-visuel')
print('IMAGES')
ref = ouvrir(os.path.join(JV, 'ecran_appro/r-groupe-2026-10-07/ref/cadre-48.png'))
c19 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E03_Chanedappro_1080x1920.png'))
c24 = ouvrir(os.path.join(JV, 'planches-par-ecran-2026-10-07/E03_Chanedappro_1080x2400.png'))

print('\n— TITRE : hauteur de capitale du « C » de « Commander » —')
def capC(im, nom, x0, x1, y0, y1, seuil=110):
    b = bbox_encre(im, x0, y0, x1, y1, seuil)
    print('   %-8s bbox %s  hauteur %d px  largeur %d px' % (nom, b[:4], b[3]-b[1]+1, b[2]-b[0]+1))
    return b
capC(ref, 'réf', 45, 110, 470, 520)
capC(c19, 'jeu19', 55, 130, 285, 360)

print('\n— BANDEAU .entete (fond #1e1b16, filet bas 1 px #3a352c) —')
for y in (440, 500, 560, 600, 620):
    print('   réf   y%4d  %s' % (y, hexa(mediane_fenetre(ref, 300, y, 800, y+5))))
for y in (250, 330, 430, 520, 580):
    print('   jeu19 y%4d  %s' % (y, hexa(mediane_fenetre(c19, 300, y, 800, y+5))))

print('\n— PAPIER DU BON (#efe7d6) —')
print('   réf  ', hexa(mediane_fenetre(ref, 600, 700, 900, 730)))
print('   jeu19', hexa(mediane_fenetre(c19, 600, 700, 900, 730)))

print('\n— FILETS POINTILLÉS entre lignes (.l border-top 1px dotted #c3b79e) —')
def pointilles(im, y, x0, x1, nom):
    px = list(im.crop((x0, y, x1, y+1)).getdata())
    som = [p for p in px if sum(p) < 600]
    print('   %-8s y=%d : %d px sombres sur %d  (médiane %s)' % (nom, y, len(som), len(px),
          hexa(mediane_fenetre(im, x0, y, x1, y+1))))
# réf : premier filet juste au-dessus de « À QUOI ÇA SERT » ~ y 745
for y in range(735, 760, 2): pointilles(ref, y, 120, 950, 'réf')
print()
for y in range(715, 745, 3): pointilles(c19, y, 120, 950, 'jeu19')

print('\n— ROUGE DES VALEURS (.l b.rouge, canon #a8402f) sur papier #efe7d6 —')
def rouge(im, box, nom):
    px = list(im.crop(box).getdata())
    r = [p for p in px if p[0] > p[1] + 25 and p[0] > 110]
    if not r: print('   %s : aucun pixel rouge' % nom); return
    r.sort(key=lambda p: -(p[0] - p[1]))
    c = r[len(r)//8]
    print('   %-8s %s %s   contraste sur #efe7d6 = %.2f:1' % (nom, c, hexa(c), contraste(c, (0xef,0xe7,0xd6))))
rouge(ref, (480, 790, 960, 830), 'réf')
rouge(c19, (560, 805, 1000, 850), 'jeu19')
print('   canon #a8402f sur #efe7d6 → %.2f:1' % contraste((0xa8,0x40,0x2f), (0xef,0xe7,0xd6)))

print('\n— PERFORATION BASSE DU BON (.bon::after, bande de 5 px CSS = 18 px) —')
print('   réf  y1165..1175 :', [hexa(mediane_fenetre(ref, x, 1165, x+4, 1175)) for x in (200, 206, 212, 218)])
print('   jeu19 bas du papier (y 1045..1060) :', [hexa(mediane_fenetre(c19, x, 1045, x+4, 1060)) for x in (200, 206, 212, 218)])

print('\n— BANDE BASSE .bas (#141a21, filet haut 2 px #2c3640) + .geste —')
print('   réf   fond bande ', hexa(mediane_fenetre(ref, 300, 1790, 700, 1830)))
print('   réf   CTA fond   ', hexa(mediane_fenetre(ref, 300, 1930, 700, 1960)))
print('   jeu19 zone CTA   ', hexa(mediane_fenetre(c19, 300, 1400, 700, 1440)))
print('   jeu19 autour CTA ', hexa(mediane_fenetre(c19, 300, 1340, 700, 1360)))
