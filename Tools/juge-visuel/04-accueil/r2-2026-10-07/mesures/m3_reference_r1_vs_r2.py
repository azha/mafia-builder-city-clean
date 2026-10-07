#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""r2 ④ — la RÉFÉRENCE a bougé elle aussi : le PNG du r1 a été rendu AVANT les quatre commits
d'atelier qui définissent la référence qui fait foi d'après `dossier.md`.

Mesure : part des pixels qui diffèrent entre le cadre 4 du r1 et le cadre 4 re-rendu aujourd'hui
(même page, même échelle 3.6, même taille 1080x2102), globalement et par bande horizontale.

Contrôle POSITIF : les deux images ont la MÊME taille (1080x2102) — sinon la comparaison n'a pas
de sens et le script sort en erreur.
Contrôle NÉGATIF : la bande du titre « LA SUITE » doit, elle, être proche (le titre n'a pas changé) ;
si TOUTES les bandes différaient autant, je mesurerais un décalage global, pas un changement de
contenu.
"""
import os, sys
from PIL import Image, ImageChops

RACINE = os.path.dirname(os.path.abspath(__file__))
A = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r1-2026-09-26/reference/cadre-4-la-suite.png'
B = os.path.abspath(os.path.join(RACINE, '..', 'reference', 'cadre-4-la-suite.png'))

BANDES = [
    ('chrome haut (bandeau, filet, medaillon)', 0, 230),
    ('art / diorama', 230, 790),
    ('titre LA SUITE', 790, 880),
    ('ligne A  (labo -> COMMANDER)', 880, 1030),
    ('ligne B  (vente -> VOIR LA VENTE)', 1030, 1280),
    ('ligne 3  (planque/consigne -> CTA)', 1280, 1560),
    ('file du lieutenant + gravite', 1560, 1800),
    ('dock', 1800, 2102),
]


def main():
    for p in (A, B):
        if not os.path.exists(p):
            print('ABSENT %s' % p); sys.exit(1)
    ia, ib = Image.open(A).convert('RGB'), Image.open(B).convert('RGB')
    print('r1  : %dx%d  %s' % (ia.size[0], ia.size[1], A))
    print('r2  : %dx%d  %s' % (ib.size[0], ib.size[1], B))
    print('CONTROLE POSITIF tailles egales : %s' % ('OK' if ia.size == ib.size else 'KO'))
    if ia.size != ib.size:
        sys.exit(1)

    diff = ImageChops.difference(ia, ib).convert('L')
    px = diff.load()
    w, h = diff.size
    SEUIL = 16          # au-dela de la frange d'anti-crenelage

    tot = 0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            if px[x, y] > SEUIL:
                tot += 1
    ech = (h // 2 + h % 2) * (w // 2 + w % 2)
    print('\npixels differents (>%d/255) sur tout le cadre : %d / %d = %.1f %%'
          % (SEUIL, tot, ech, 100.0 * tot / ech))

    print('\npar bande :')
    for nom, y0, y1 in BANDES:
        n = m = 0
        for y in range(y0, min(y1, h), 2):
            for x in range(0, w, 2):
                m += 1
                if px[x, y] > SEUIL:
                    n += 1
        print('   %-42s %6.1f %% differents' % (nom, 100.0 * n / m if m else 0))


if __name__ == '__main__':
    main()
