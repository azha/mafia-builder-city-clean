# -*- coding: utf-8 -*-
"""Zones de la REFERENCE (300 CSS = 1080 px, x3,6) : bandeau-evocation, cn-tete, cn-body, cn-bas."""
from lib_mes import *

REF = ouvrir('../reference-1080x2102.png'); P = REF.load()
K = 1080/300.0

print('--- frontieres horizontales (mediane de ligne) ---')
prev = None
for y in range(0, 2102):
    ech = sorted([P[x, y] for x in range(10, 1070, 6)], key=lum)
    med = ech[len(ech)//2]
    if prev is not None and (abs(med[0]-prev[0])+abs(med[1]-prev[1])+abs(med[2]-prev[2])) > 12:
        print('   y=%4d (%.1f CSS) : %s -> %s' % (y, y/K, str(prev), str(med)))
    prev = med
print()

print('--- textes de l en-tete (.cn-tete) ---')
def clair(c): return lum(c) > 95
for nom, yr, xr in [('h3 Les ordres de ce soir', (440, 520), (30, 1050)),
                    ('p sous-titre', (520, 580), (30, 1050))]:
    ls = profil_lignes(REF, xr[0], xr[1], clair, yr[0], yr[1])
    for l in ls:
        b = bbox(REF, clair, xr[0], l[0], xr[1], l[1]+1)
        print('   %-28s y=%d..%d x=%d..%d  hauteur=%d px = %.2f CSS  gauche=%.1f CSS'
              % (nom, l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/K, b[0]/K))
print()

print('--- en-tete de la page (.cn-page h4 : titre + compteur) ---')
def sombre_sur_creme(c): return lum(c) < 120
ls = profil_lignes(REF, 80, 1000, sombre_sur_creme, 645, 720)
for l in ls:
    b = bbox(REF, sombre_sur_creme, 80, l[0], 1000, l[1]+1)
    print('   y=%d..%d x=%d..%d  hauteur=%d px = %.2f CSS' % (l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/K))
print()

print('--- 8 rangees (.cn-slot) : pas vertical ---')
def pastille(c):
    return (abs(c[0]-0x2a) <= 16 and abs(c[1]-0x21) <= 16 and abs(c[2]-0x18) <= 16) or \
           (abs(c[0]-0xcb) <= 12 and abs(c[1]-0xbf) <= 12 and abs(c[2]-0xa4) <= 12)
ls = profil_lignes(REF, 88, 140, pastille, 700, 1460)
ls = [l for l in ls if l[1]-l[0] > 30]
print('   %d pastilles : %s' % (len(ls), ls))
cs = [ (l[0]+l[1])/2.0 for l in ls ]
print('   centres y = %s' % ['%.1f' % c for c in cs])
print('   pas = %s px  = %s CSS' % (['%.1f'%(cs[i+1]-cs[i]) for i in range(len(cs)-1)],
                                    ['%.2f'%((cs[i+1]-cs[i])/K) for i in range(len(cs)-1)]))
print()

print('--- pied : citation + bouton ---')
for nom, yr in [('citation Lt. Rin', (1800, 1900)), ('bouton', (1930, 2060))]:
    ls = profil_lignes(REF, 30, 1050, clair, yr[0], yr[1])
    for l in ls:
        b = bbox(REF, clair, 30, l[0], 1050, l[1]+1)
        print('   %-18s y=%d..%d x=%d..%d hauteur=%d px=%.2f CSS' % (nom, l[0], l[1], b[0], b[2], l[1]-l[0]+1, (l[1]-l[0]+1)/K))
