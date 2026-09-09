# -*- coding: utf-8 -*-
"""Detecteur de la PAGE DU CARNET (aplat creme #efe7d6, trait d'ecriture #cbbfa4).
Controle POSITIF : la reference DOIT en contenir beaucoup (c'est l'element hero).
Controle NEGATIF : le bandeau du HUD canon (chrome sombre) DOIT en contenir ~0.
"""
from PIL import Image

REF = '../reference-1080x2102.png'
CAP = '../capture-1080x2400.png'
CANON = '../hud-canon-1176.png'

CREME = (0xef, 0xe7, 0xd6)   # .cn-page background
REGLE = (0xcb, 0xbf, 0xa4)   # repeating-linear-gradient (le reglure)

def compte(img, cible, tol=14, pas=2):
    p = img.load(); w, h = img.size
    n = 0; tot = 0
    x0 = x1 = y0 = y1 = None
    for y in range(0, h, pas):
        for x in range(0, w, pas):
            tot += 1
            r, g, b = p[x, y]
            if abs(r-cible[0]) <= tol and abs(g-cible[1]) <= tol and abs(b-cible[2]) <= tol:
                n += 1
                if x0 is None or x < x0: x0 = x
                if x1 is None or x > x1: x1 = x
                if y0 is None or y < y0: y0 = y
                if y1 is None or y > y1: y1 = y
    return n, tot, (x0, y0, x1, y1)

for nom, chemin in [('REFERENCE', REF), ('CAPTURE', CAP), ('HUD-CANON (controle negatif)', CANON)]:
    im = Image.open(chemin).convert('RGB')
    print('%-30s %s  taille=%s' % (nom, chemin, im.size))
    for lib, cible in [('creme #efe7d6', CREME), ('reglure #cbbfa4', REGLE)]:
        n, tot, bb = compte(im, cible)
        print('   %-18s %7d / %7d echantillons = %6.3f %%   bbox=%s' % (lib, n, tot, 100.0*n/tot, bb))
