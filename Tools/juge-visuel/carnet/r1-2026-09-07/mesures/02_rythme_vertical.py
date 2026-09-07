# -*- coding: utf-8 -*-
"""Rythme vertical : luminance moyenne par ligne + frontieres (saut > seuil).
Controle positif : la reference DOIT montrer un saut enorme a l'entree de la page creme.
"""
from PIL import Image

def profil(chemin, pas=1):
    im = Image.open(chemin).convert('RGB'); p = im.load(); w, h = im.size
    print('%s taille=%s' % (chemin, im.size))
    L = []
    for y in range(h):
        s = 0; n = 0
        for x in range(0, w, 4):
            r, g, b = p[x, y]; s += 0.2126*r + 0.7152*g + 0.0722*b; n += 1
        L.append(s/n)
    return im, L

def frontieres(L, seuil=8.0):
    out = []
    for y in range(1, len(L)):
        d = L[y] - L[y-1]
        if abs(d) >= seuil:
            out.append((y, round(L[y-1],1), round(L[y],1), round(d,1)))
    return out

for chemin in ['../reference-1080x2102.png', '../capture-1080x2400.png', '../hud-canon-1176.png']:
    im, L = profil(chemin)
    fr = frontieres(L)
    print('  frontieres (|delta luminance moyenne de ligne| >= 8) : %d' % len(fr))
    for f in fr:
        print('    y=%4d  %6.1f -> %6.1f  (%+.1f)' % f)
    print('  luminance moyenne image = %.2f   min ligne=%.2f a y=%d   max ligne=%.2f a y=%d' % (
        sum(L)/len(L), min(L), L.index(min(L)), max(L), L.index(max(L))))
    print()
