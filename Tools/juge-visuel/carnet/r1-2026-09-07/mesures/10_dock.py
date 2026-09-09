# -*- coding: utf-8 -*-
"""Dock (barre d onglets) : hauteur, ronds, libelles, marqueur d onglet actif.
Normalise en CSS-HUD (392) : capture x2,7551 ; canon x3,0000."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); PC = CAP.load()
CAN = ouvrir('../hud-canon-1176.png');    PN = CAN.load()
KCAP, KCAN = 1080/392.0, 1176/392.0

def clair(c): return lum(c) > 78
def cercle_bord(c):
    # bord des ronds : bleu-gris plus clair que le fond du dock
    r,g,b = c
    return 30 < lum(c) < 110 and b > r+8

print('--- haut du dock : 1re ligne dont la mediane change de facon durable ---')
for nom, im, p, K, y0, y1 in [('CAPTURE', CAP, PC, KCAP, 2050, 2400), ('CANON', CAN, PN, KCAN, 1700, 2091)]:
    w, h = im.size
    prev = None
    for y in range(y0, h):
        ech = sorted([p[x, y] for x in range(0, w, 5)], key=lum)
        med = ech[len(ech)//2]
        if prev is not None and abs(lum(med)-lum(prev)) > 4:
            print('   %-8s rupture a y=%4d : %s -> %s   (hauteur du dock = %d px = %.1f CSS)'
                  % (nom, y, prev, med, h-y, (h-y)/K))
        prev = med
print()

print('--- ronds du dock : segments de colonnes portant le liseré ---')
for nom, im, K, yb in [('CAPTURE', CAP, KCAP, (2180, 2300)), ('CANON', CAN, KCAN, (1800, 1930))]:
    seg = profil_colonnes(im, yb[0], yb[1], cercle_bord, 0, im.size[0])
    seg = [s for s in seg if s[1]-s[0] > 20]
    print('   %-8s %d ronds : %s' % (nom, len(seg), seg))
    for i, s in enumerate(seg):
        b = bbox(im, cercle_bord, s[0], yb[0]-40, s[1]+1, yb[1]+40)
        print('        rond %d : x=%d..%d (D=%d px = %.1f CSS)  centre_x=%.1f CSS  y=%d..%d'
              % (i+1, s[0], s[1], s[1]-s[0]+1, (s[1]-s[0]+1)/K, ((s[0]+s[1])/2.0)/K, b[1], b[3]))
print()

print('--- libelles du dock : blocs d encre claire ---')
for nom, im, K, yb in [('CAPTURE', CAP, KCAP, (2310, 2360)), ('CANON', CAN, KCAN, (1950, 2010))]:
    seg = profil_colonnes(im, yb[0], yb[1], clair, 0, im.size[0])
    seg = [s for s in seg if s[1]-s[0] > 3]
    # regrouper les lettres proches
    grp = []
    for s in seg:
        if grp and s[0]-grp[-1][1] < 14: grp[-1] = (grp[-1][0], s[1])
        else: grp.append(list(s) if False else (s[0], s[1]))
    print('   %-8s %d libelles : %s' % (nom, len(grp), grp))
    for i, g in enumerate(grp):
        ls = profil_lignes(im, g[0], g[1]+1, clair, yb[0]-20, yb[1]+20)
        h = (ls[0][1]-ls[0][0]+1) if ls else 0
        print('        libelle %d : x=%d..%d  larg=%.1f CSS  hauteur de capitale=%d px = %.2f CSS'
              % (i+1, g[0], g[1], (g[1]-g[0]+1)/K, h, h/K))
print()

print('--- marqueur d onglet ACTIF (or) ---')
def dore(c):
    r,g,b = c
    return r > 140 and g >= 0.62*r and b < 0.72*g and g > 100
for nom, im, K, yb in [('CAPTURE', CAP, KCAP, (2152, 2400)), ('CANON', CAN, KCAN, (1739, 2091))]:
    b = bbox(im, dore, 0, yb[0], im.size[0], yb[1])
    if b[0] is None:
        print('   %-8s AUCUN pixel or dans le dock' % nom); continue
    seg = profil_colonnes(im, yb[0], yb[1], dore, 0, im.size[0])
    print('   %-8s or : bbox=%s  n=%d  segments=%s' % (nom, b[:4], b[4], seg))
