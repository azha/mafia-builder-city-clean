#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m5c — marges du panneau mesurees sur une LIGNE PLATE (choisie, pas supposee).
1) on cherche, DANS le panneau, les lignes les plus plates (moins de 2 % de colonnes s ecartant
   de plus de 10 de la mediane de la ligne) : ce sont les lignes sans texte ni bouton ;
2) sur ces lignes on balaie depuis les DEUX bords de l image vers le centre jusqu au premier
   pixel sombre : c est le bord du panneau.
Controle positif : la reference doit rendre des marges symetriques proches de 12 px CSS x3,6 = 43.
Controle negatif : la meme procedure appliquee a une ligne NON plate (prise dans le texte) est
imprimee a cote : elle doit donner un resultat different.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
IMG = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 840, 1650),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 898, 1440),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 1304, 1848),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def ligne(im, y):
    px = im.load()
    return [lum(px[x, y]) for x in range(im.width)]


def platitude(L, g=120, d=960):
    seg = L[g:d]
    m = sorted(seg)[len(seg) // 2]
    return sum(1 for v in seg if abs(v - m) > 10) / float(len(seg)), m


def marges(L, m):
    seuil = m + 12
    gl = 0
    while gl < len(L) and L[gl] > seuil:
        gl += 1
    dr = len(L) - 1
    while dr > 0 and L[dr] > seuil:
        dr -= 1
    return gl, dr


def main():
    for k, (chemin, y0, y1) in IMG.items():
        im = Image.open(chemin).convert('RGB')
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        cands = []
        for y in range(y0, y1):
            L = ligne(im, y)
            p, m = platitude(L)
            cands.append((p, y, m, L))
        cands.sort(key=lambda t: t[0])
        print('   5 lignes les plus plates du panneau :')
        for p, y, m, L in cands[:5]:
            gl, dr = marges(L, m)
            print('      y=%4d  non-plat=%.2f%%  mediane=%.1f  ->  gauche=%d droite=%d largeur=%d  marges %d / %d'
                  % (y, 100 * p, m, gl, dr, dr - gl + 1, gl, im.width - 1 - dr))
        print('   [controle negatif] ligne la MOINS plate :')
        p, y, m, L = cands[-1]
        gl, dr = marges(L, m)
        print('      y=%4d  non-plat=%.2f%%  mediane=%.1f  ->  gauche=%d droite=%d largeur=%d'
              % (y, 100 * p, m, gl, dr, dr - gl + 1))
        print()


if __name__ == '__main__':
    main()
