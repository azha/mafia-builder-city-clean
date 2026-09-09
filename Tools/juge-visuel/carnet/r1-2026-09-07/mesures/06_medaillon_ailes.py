# -*- coding: utf-8 -*-
"""Medaillon + ailes, capture vs canon HUD, normalises en CSS-HUD (392).
ATTENTION : le FILET du bandeau (y=141-142 capture) est de la MEME couleur que l anneau
en etat BRULANT -> toutes les bbox d anneau sont bornees AU-DESSUS du filet (controle de portee)."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); PC = CAP.load()
CAN = ouvrir('../hud-canon-1176.png');    PN = CAN.load()
KCAP, KCAN = 1080/392.0, 1176/392.0

def braise(c):
    r,g,b = c
    return r > 150 and g < r-60 and b < r-70
def laiton(c):
    r,g,b = c
    return r > 130 and 0.62*r <= g <= 0.92*r and b < 0.70*g
def dore(c):
    r,g,b = c
    return r > 140 and g >= 0.62*r and b < 0.72*g and g > 100

print('--- anneau : bbox BORNEE au-dessus du filet ---')
bc = bbox(CAP, braise, 380, 0, 720, 139)
bn = bbox(CAN, laiton, 440, 0, 720, 150)
for nom, b, K in [('CAPTURE', bc, KCAP), ('CANON', bn, KCAN)]:
    print('   %-8s bbox=(%d,%d,%d,%d) D_x=%d px=%.1f CSS  D_y=%d px=%.1f CSS  centre=(%.1f,%.1f) px'
          % (nom, b[0], b[1], b[2], b[3], b[2]-b[0]+1, (b[2]-b[0]+1)/K, b[3]-b[1]+1, (b[3]-b[1]+1)/K,
             (b[0]+b[2])/2.0, (b[1]+b[3])/2.0))
print()

print('--- coupe horizontale par le centre : bords de l anneau (>=50% de la couleur pure) ---')
for nom, im, p, pred, b, K, pur in [('CAPTURE', CAP, PC, braise, bc, KCAP, (224,102,74)),
                                    ('CANON', CAN, PN, laiton, bn, KCAN, (171,137,61))]:
    cy = int((b[1]+b[3])/2)
    xs = [x for x in range(b[0]-30, b[2]+31) if pred(p[x, cy])]
    seg=[]; deb=None; prev=None
    for x in xs:
        if deb is None: deb=x
        elif x != prev+1: seg.append((deb,prev)); deb=x
        prev=x
    if deb is not None: seg.append((deb,prev))
    ext = (seg[0][0], seg[-1][1])
    print('   %-8s y=%d segments=%s' % (nom, cy, seg))
    print('            D exterieur=%d px = %.2f CSS   trait=%s px = %s CSS'
          % (ext[1]-ext[0]+1, (ext[1]-ext[0]+1)/K, [s[1]-s[0]+1 for s in seg[:1]+seg[-1:]],
             ['%.2f'%((s[1]-s[0]+1)/K) for s in seg[:1]+seg[-1:]]))
print()

print('--- portee de la LUEUR autour de l anneau (capture) : exces de rouge au-dela du trait ---')
cy = int((bc[1]+bc[3])/2)
xs = [x for x in range(bc[0]-40, bc[2]+41) if braise(PC[x, cy])]
xg = xs[0]
print('   trait gauche a x=%d, y=%d ; profil vers la gauche :' % (xg, cy))
for d in range(0, 26, 2):
    c = PC[xg-d, cy]
    print('      d=%2d  x=%4d  %s  exces_rouge=%d' % (d, xg-d, c, c[0]-c[2]))
print()

print('--- ecart encre ARGENT <-> premier pixel BRAISE, par ligne (capture) ---')
mini = 10**9; yl = None
for y in range(40, 135):
    xo = [x for x in range(100, 470) if dore(PC[x, y])]
    xb = [x for x in range(400, 720) if braise(PC[x, y])]
    if xo and xb:
        d = min(xb) - max(xo)
        if d < mini: mini, yl = d, y
print('   ecart minimal = %d px = %.2f CSS a y=%d  (canon : 87,00 CSS, mesure 04)' % (mini, mini/KCAP, yl))
print()

print('--- aile DROITE : segments de lignes d encre claire ---')
def clair(c): return lum(c) > 90
for nom, im, K, xr in [('CAPTURE', CAP, KCAP, (700, 1080)), ('CANON', CAN, KCAN, (760, 1176))]:
    seg = profil_lignes(im, xr[0], xr[1], clair, 10, 145)
    print('   %-8s lignes d encre : %s' % (nom, seg))
    for s in seg:
        b = bbox(im, clair, xr[0], s[0], xr[1], s[1]+1)
        print('        y=%d..%d  x=%d..%d  hauteur=%d px=%.2f CSS' % (s[0], s[1], b[0], b[2], s[1]-s[0]+1, (s[1]-s[0]+1)/K))
