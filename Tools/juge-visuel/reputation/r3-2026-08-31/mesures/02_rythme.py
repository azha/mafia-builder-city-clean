# -*- coding: utf-8 -*-
"""02 — RYTHME VERTICAL : frontières des blocs le long d'une colonne, par ÉCART DE LUMINANCE
(un liseré est plus clair que ses deux voisins). Rend les bornes en px image ET en px CSS
mesurés DEPUIS LE HAUT DU CERNE (le seul repère commun aux deux images : le chrome absent de
la capture vaut ~130 px CSS et interdit toute comparaison en absolu).
Contrôle positif : la borne basse du liseré doré de l'enseigne doit tomber à ~59 px CSS sous le
cerne dans les DEUX images (valeur CSS : inset 5 -> marge 13 + hauteur 51).
Contrôle négatif : la borne basse du cerne doit, elle, différer (452 vs 523)."""
from PIL import Image

REF = ('REF', '/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png', 3.0, 377, 1730)
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png', 3.6, 19, 1900)
CAP24 = ('CAP2400', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png', 3.6, None, None)

def lum(p): return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def frontieres(im, x, y0, y1, seuil=9):
    px = im.load(); out = []
    L = [lum(px[x, y]) for y in range(y0, y1)]
    i = 1
    while i < len(L) - 1:
        if L[i] - L[i-1] > seuil:          # montée : début d'un liseré
            j = i
            while j < len(L) - 1 and L[j+1] >= L[i] - seuil/2: j += 1
            out.append((y0+i, y0+j, round(L[i]-L[i-1], 1)))
            i = j + 1
        else: i += 1
    return out

for nom, path, sc, cy0, cy1 in (REF, CAP, CAP24):
    im = Image.open(path).convert('RGB'); print('='*76); print(nom, path.split('/')[-1], im.size)
    W, H = im.size
    if cy0 is None:   # retrouver le cerne pour la 3e image
        px = im.load()
        cy0 = next(y for y in range(H) if px[48, y][0] > 110 and px[48, y][0]-px[48, y][2] > 55)
        cy1 = next(y for y in range(H-1, 0, -1) if px[48, y][0] > 110 and px[48, y][0]-px[48, y][2] > 55)
        print(' cerne detecte y=%d..%d' % (cy0, cy1))
    x = int(W*0.06)
    print(' colonne x=%d ; cerne y0=%d y1=%d ; hauteur cerne=%.1f CSS' % (x, cy0, cy1, (cy1-cy0)/sc))
    for a, b, d in frontieres(im, x, cy0, cy1):
        print('   y=%4d..%-4d  Δlum=%5.1f   -> %7.1f .. %7.1f px CSS sous le cerne'
              % (a, b, d, (a-cy0)/sc, (b-cy0)/sc))
