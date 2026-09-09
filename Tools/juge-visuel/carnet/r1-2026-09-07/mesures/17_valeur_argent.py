# -*- coding: utf-8 -*-
"""Hauteur de capitale de la VALEUR ARGENT et etendue reelle du filet (degrade ?)."""
from lib_mes import *

CAP = ouvrir('../capture-1080x2400.png'); PC = CAP.load()
CAN = ouvrir('../hud-canon-1176.png');    PN = CAN.load()
KC, KN = 1080/392.0, 1176/392.0

def dore(c):
    r,g,b = c
    return r > 140 and g >= 0.62*r and b < 0.72*g and g > 100

print('--- hauteur de capitale de la VALEUR (chiffres) ---')
ls = profil_lignes(CAP, 177, 447, dore, 46, 112)
print('   CAPTURE blocs = %s' % ls)
for l in ls:
    print('        y=%d..%d  hauteur=%d px = %.2f CSS' % (l[0], l[1], l[1]-l[0]+1, (l[1]-l[0]+1)/KC))
ls = profil_lignes(CAN, 45, 240, dore, 55, 115)
print('   CANON   blocs = %s' % ls)
for l in ls:
    print('        y=%d..%d  hauteur=%d px = %.2f CSS' % (l[0], l[1], l[1]-l[0]+1, (l[1]-l[0]+1)/KN))
print()

print('--- filet : profil de luminance vers les bords (degrade ?) ---')
for nom, im, p, y, K in [('CAPTURE', CAP, PC, 141, KC), ('CANON', CAN, PN, 154, KN)]:
    ech = []
    for x in range(0, 260, 20):
        c = p[x, y]
        ech.append('%d(%.0f CSS):%s' % (x, x/K, str(c)))
    print('   %-8s y=%d : %s' % (nom, y, '  '.join(ech)))
print()

print('--- libelle CHALEUR/HEAT sous le manometre ---')
def creme(c):
    r,g,b = c
    return r > 165 and g > 155 and b > 125 and abs(r-g) < 40
for nom, im, K, xr, yr in [('REFERENCE', ouvrir('../reference-1080x2102.png'), 1080/300.0, (430, 650), (135, 210)),
                           ('CAPTURE', CAP, KC, (430, 650), (130, 205)),
                           ('CANON', CAN, KN, (470, 700), (140, 215))]:
    ls = profil_lignes(im, xr[0], xr[1], creme, yr[0], yr[1])
    print('   %-9s blocs = %s' % (nom, ls))
    for l in ls:
        b = bbox(im, creme, xr[0], l[0], xr[1], l[1]+1)
        print('        y=%d..%d x=%d..%d hauteur=%d px=%.2f CSS larg=%.2f CSS' % (
            l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/K, (b[2]-b[0]+1)/K))
