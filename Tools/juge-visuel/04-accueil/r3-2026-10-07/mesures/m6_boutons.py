#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m6 — les trois BOUTONS de LA SUITE : boite, remplissage, bord, couleur du libelle.
Intention nommee par la CSS de l atelier :
  .g4     { border:1px solid #ffffff2a ; background:#ffffff0a ; color:#eae0c8 ; border-radius:8px }
  .g4.or  { background:linear-gradient(180deg,#e9c56b,#c99a37) ; color:#241804 ; border-color:#8a611c }
Le bouton secondaire est donc un bouton FANTOME : un voile blanc a 10/255 sur le verre.
Methode : dans une fenetre de recherche, la boite du bouton est la plus grande composante
rectangulaire dont la luminance s ecarte du fond du verre ; on echantillonne le remplissage
a 10 px SOUS le bord haut (hors du libelle, hors de la frange du bord).
Controle positif : le bouton OR doit sortir, dans LES DEUX images, tres clair (lum > 130) —
une sonde qui ne verrait pas l or ne verrait rien.
Controle negatif : une fenetre prise dans le verre NU doit rendre le fond du verre, pas un bouton.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
REF = os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png')
C19 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png')
C24 = os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png')

# fenetres de recherche (x0,y0,x1,y1), determinees au profil m1 puis elargies de 30 px
FEN = {
    'REF': {'or_commander': (600, 1080 - 150, 1060, 1120),
            'voir_la_vente': (600, 1130, 1060, 1290),
            'blanchir': (600, 1380, 1060, 1560)},
    'C19': {'or_commander': (620, 955, 1060, 1075),
            'voir_la_vente': (620, 1090, 1060, 1215),
            'blanchir': (620, 1270, 1060, 1400)},
    'C24': {'or_commander': (620, 1360, 1060, 1480),
            'voir_la_vente': (620, 1495, 1060, 1620),
            'blanchir': (620, 1675, 1060, 1810)},
}
FOND = {'REF': (600, 1700, 40), 'C19': (600, 1410, 25), 'C24': (600, 1817, 25)}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, cx, cy, r):
    px = im.load()
    ch = [[], [], []]
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            p = px[x, y]
            for i in range(3):
                ch[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch)


def boite(im, fen, fondlum, delta=6):
    x0, y0, x1, y1 = fen
    px = im.load()
    xs = []; ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if abs(lum(px[x, y]) - fondlum) > delta:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    # on borne par les centiles 1/99 pour ignorer le bruit du decor derriere le verre
    xs.sort(); ys.sort()
    n = len(xs)
    return xs[n // 200], ys[n // 200], xs[-1 - n // 200], ys[-1 - n // 200]


def main():
    for k, chemin in (('REF', REF), ('C19', C19), ('C24', C24)):
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        fx, fy, fr = FOND[k]
        fond = med(im, fx, fy, fr)
        fl = lum(fond)
        print('   fond du verre (fenetre %dx%d en %d,%d) = RGB %s  lum %.1f'
              % (2 * fr + 1, 2 * fr + 1, fx, fy, fond, fl))
        for nom, fen in FEN[k].items():
            b = boite(im, fen, fl)
            if not b:
                print('   %-16s AUCUNE boite detectee' % nom)
                continue
            bx0, by0, bx1, by1 = b
            w = bx1 - bx0 + 1; h = by1 - by0 + 1
            cx = (bx0 + bx1) // 2
            rempl = med(im, bx0 + 28, by0 + 12, 6)      # sous le bord haut, a gauche du libelle
            rempl2 = med(im, bx1 - 28, by1 - 12, 6)     # coin oppose
            bord = None
            bl = -1
            for yy in range(by0 - 3, by0 + 6):
                v = lum(im.getpixel((cx, yy)))
                if v > bl:
                    bl = v; bord = (cx, yy, im.getpixel((cx, yy)))
            print('   %-16s boite x %4d..%4d (%3d px)  y %4d..%4d (%3d px)'
                  % (nom, bx0, bx1, w, by0, by1, h))
            print('   %-16s remplissage haut-gauche RGB %s (lum %.1f) · bas-droit RGB %s (lum %.1f)'
                  % ('', rempl, lum(rempl), rempl2, lum(rempl2)))
            print('   %-16s pixel le plus clair du BORD HAUT (x=%d) : y=%d RGB %s (lum %.1f)'
                  % ('', bord[0], bord[1], bord[2], bl))
        print()


if __name__ == '__main__':
    main()
