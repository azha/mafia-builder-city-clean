# -*- coding: utf-8 -*-
"""Geometrie du CHROME : filet du bandeau, haut du dock, rect libre.
Repere : capture 1080 px = 392 CSS-HUD (x2,7551) ; canon 1176 px = 392 CSS-HUD (x3,0000).
Facteur canon -> capture = 1080/1176 = 0,918367.
Controle positif : la largeur pleine (1080 / 1176) doit etre retrouvee sur le filet.
"""
from PIL import Image

def lignes_uniformes(chemin, y0, y1, tol=18, couv=0.70):
    im = Image.open(chemin).convert('RGB'); p = im.load(); w, h = im.size
    print('%s taille=%s  bande y=%d..%d' % (chemin, im.size, y0, y1))
    res = []
    for y in range(y0, min(y1, h)):
        # couleur mediane de la ligne (echantillon)
        ech = [p[x, y] for x in range(0, w, 3)]
        ech_tri = sorted(ech, key=lambda c: 0.2126*c[0]+0.7152*c[1]+0.0722*c[2])
        med = ech_tri[len(ech_tri)//2]
        n = sum(1 for c in ech if abs(c[0]-med[0]) <= tol and abs(c[1]-med[1]) <= tol and abs(c[2]-med[2]) <= tol)
        f = n/len(ech)
        if f >= couv:
            res.append((y, med, round(f, 3)))
    return im, res

print('=== CAPTURE : recherche du filet du bandeau (y 120..220) ===')
im, r = lignes_uniformes('../capture-1080x2400.png', 120, 230)
for y, med, f in r:
    print('   y=%4d  mediane=%-16s couverture=%.2f' % (y, str(med), f))

print()
print('=== CANON HUD : recherche du filet du bandeau (y 130..250) ===')
im, r = lignes_uniformes('../hud-canon-1176.png', 130, 260)
for y, med, f in r:
    print('   y=%4d  mediane=%-16s couverture=%.2f' % (y, str(med), f))

print()
print('=== CAPTURE : haut du dock (y 2100..2400) ===')
im, r = lignes_uniformes('../capture-1080x2400.png', 2100, 2400)
prev = None
for y, med, f in r:
    if prev is None or med != prev:
        print('   y=%4d  mediane=%-16s couverture=%.2f' % (y, str(med), f))
    prev = med
