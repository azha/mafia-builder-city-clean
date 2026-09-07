# -*- coding: utf-8 -*-
"""Filet du bandeau (etendue horizontale) + aile gauche ARGENT (libelle, valeur, jauge).
Normalise en CSS-HUD (392). Temoin d ETAT : le compte est BRULANT -> le filet doit etre
en --braise (224,102,74) cote client, LAITON cote canon (etat calme) : ce n est PAS un ecart."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); PC = CAP.load()
CAN = ouvrir('../hud-canon-1176.png');    PN = CAN.load()
KC, KN = 1080/392.0, 1176/392.0

def braise(c):
    r,g,b = c
    return r > 150 and g < r-60 and b < r-70
def laiton(c):
    r,g,b = c
    return r > 130 and 0.62*r <= g <= 0.92*r and b < 0.70*g
def dore(c):
    r,g,b = c
    return r > 140 and g >= 0.62*r and b < 0.72*g and g > 100

print('--- etendue du FILET ---')
for nom, im, p, pred, ys, K in [('CAPTURE', CAP, PC, braise, (141, 142), KC),
                                ('CANON',   CAN, PN, laiton,  (153, 155), KN)]:
    for y in range(ys[0], ys[1]+1):
        xs = [x for x in range(im.size[0]) if pred(p[x, y])]
        seg = []; deb = None; prev = None
        for x in xs:
            if deb is None: deb = x
            elif x != prev+1: seg.append((deb, prev)); deb = x
            prev = x
        if deb is not None: seg.append((deb, prev))
        seg = [s for s in seg if s[1]-s[0] > 8]
        print('   %-8s y=%d : %d segments %s  -> de %.1f CSS a %.1f CSS  (marge G=%.1f, D=%.1f CSS)'
              % (nom, y, len(seg), seg, seg[0][0]/K, seg[-1][1]/K, seg[0][0]/K, (im.size[0]-1-seg[-1][1])/K))
        break
print()

print('--- aile GAUCHE : libelle ARGENT, valeur, jauge ---')
def clair(c): return lum(c) > 85
for nom, im, K, xr, yr in [('CAPTURE', CAP, KC, (0, 470), (10, 135)), ('CANON', CAN, KN, (0, 470), (10, 150))]:
    ls = profil_lignes(im, xr[0], xr[1], clair, yr[0], yr[1])
    print('   %-8s blocs de lignes : %s' % (nom, ls))
    for l in ls:
        b = bbox(im, clair, xr[0], l[0], xr[1], l[1]+1)
        print('        y=%3d..%3d  x=%3d..%3d  hauteur=%2d px=%.2f CSS  gauche=%.1f CSS  largeur=%.1f CSS'
              % (l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/K, b[0]/K, (b[2]-b[0]+1)/K))
print()

print('--- jauge doree sous la valeur (barre pleine) ---')
for nom, im, p, K, yr in [('CAPTURE', CAP, PC, KC, (100, 135)), ('CANON', CAN, PN, KN, (110, 150))]:
    for y in range(yr[0], yr[1]):
        xs = [x for x in range(0, 500) if dore(p[x, y])]
        if len(xs) > 30:
            print('   %-8s y=%3d  barre or de x=%d a x=%d  (%d px = %.1f CSS)  debut=%.1f CSS'
                  % (nom, y, min(xs), max(xs), max(xs)-min(xs)+1, (max(xs)-min(xs)+1)/K, min(xs)/K))
            break
