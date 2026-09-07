# -*- coding: utf-8 -*-
"""Dock : comparaison capture vs canon HUD remis a la MEME largeur (1080 px = 392 CSS).
Le canon porte une pastille d annotation (6) a gauche : la zone x<170 est EXCLUE (portee declaree)."""
from lib_mes import *

CAP = ouvrir('zoom-cap-dock.png')   # crop capture y=2130..2400
CAN = ouvrir('zoom-can-dock.png')   # crop canon y=1730..2091 remis a 1080 de large
K = 1080/392.0

def clair(c): return lum(c) > 95
def liseré(c):
    r,g,b = c
    return 35 < lum(c) < 130 and b >= r+6

print('--- ronds : segments de colonnes portant le lisere, x>=170 (pastille (6) du canon exclue) ---')
for nom, im, yb in [('CAPTURE', CAP, (40, 180)), ('CANON', CAN, (100, 240))]:
    seg = [s for s in profil_colonnes(im, yb[0], yb[1], liseré, 170, 1000) if s[1]-s[0] > 40]
    print('   %-8s %d ronds' % (nom, len(seg)))
    for i, s in enumerate(seg):
        ls = profil_lignes(im, s[0], s[1]+1, liseré, yb[0]-40, yb[1]+40)
        ls = [l for l in ls if l[1]-l[0] > 40]
        hy = (ls[0][1]-ls[0][0]+1) if ls else 0
        print('        rond %d : x=%3d..%3d  D_x=%3d px = %5.1f CSS   D_y=%3d px = %5.1f CSS  centre_x=%6.1f CSS'
              % (i+1, s[0], s[1], s[1]-s[0]+1, (s[1]-s[0]+1)/K, hy, hy/K, ((s[0]+s[1])/2.0)/K))
print()

print('--- libelles : blocs d encre claire, regroupes ---')
for nom, im, yb in [('CAPTURE', CAP, (185, 225)), ('CANON', CAN, (245, 290))]:
    seg = [s for s in profil_colonnes(im, yb[0], yb[1], clair, 170, 1010) if s[1]-s[0] >= 2]
    grp = []
    for s in seg:
        if grp and s[0]-grp[-1][1] <= 18: grp[-1] = (grp[-1][0], s[1])
        else: grp.append((s[0], s[1]))
    print('   %-8s %d libelles' % (nom, len(grp)))
    for i, g in enumerate(grp):
        ls = [l for l in profil_lignes(im, g[0], g[1]+1, clair, yb[0]-15, yb[1]+15)]
        hy = sum(l[1]-l[0]+1 for l in ls)
        print('        libelle %d : x=%3d..%3d  larg=%5.1f CSS  hauteur de capitale=%2d px = %.2f CSS  centre_x=%6.1f CSS'
              % (i+1, g[0], g[1], (g[1]-g[0]+1)/K, hy, hy/K, ((g[0]+g[1])/2.0)/K))
print()

print('--- marqueur ACTIF (or) et pastille de notification ---')
def dore(c):
    r,g,b = c
    return r > 140 and g >= 0.60*r and b < 0.72*g and g > 95
for nom, im in [('CAPTURE', CAP), ('CANON', CAN)]:
    seg = profil_colonnes(im, 0, im.size[1], dore, 170, 1010)
    print('   %-8s segments or (x>=170) : %s' % (nom, seg))
    for s in seg:
        b = bbox(im, dore, s[0], 0, s[1]+1, im.size[1])
        print('        x=%d..%d  y=%d..%d  (%dx%d px)  centre_x=%.1f CSS' % (s[0], s[1], b[1], b[3], s[1]-s[0]+1, b[3]-b[1]+1, ((s[0]+s[1])/2.0)/K))
