#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M4 — bbox d'ENCRE et hauteur de capitale des textes du chrome haut + l'artefact gris à gauche.

On mesure l'ENCRE (les pixels au-dessus d'un seuil de luminance dans une fenêtre), jamais une
boîte supposée — une boîte plus grande que son contenu ment sur la place prise.

Le seuil est DÉRIVÉ par fenêtre : médiane du fond de la fenêtre + 40. Chaque fenêtre imprime son
seuil et son taux d'encre : un taux à 0 % ou à 100 % veut dire que le seuil est faux, pas que le
texte est absent.

Contrôle positif : la largeur des deux images est 1080 dans les deux cas — la bbox en X est donc
DIRECTEMENT comparable (pas de mise à l'échelle horizontale). Le script l'imprime.
Contrôle négatif : la fenêtre « fond vide » (un carré d'art sans texte) doit rendre 0 % d'encre.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(ICI, '../reference/cadre-4-la-suite.png')
J24 = os.path.join(ICI, '../captures/p1_lancement_1080x2400.png')
J19 = os.path.join(ICI, '../captures/p1_lancement_1080x1920.png')


def encre(path, box, marge=40, nom=''):
    im = Image.open(path).convert('L')
    w, h = im.size
    c = im.crop(box)
    vals = sorted(c.getdata())
    fond = vals[len(vals) // 2]
    seuil = fond + marge
    px = c.load()
    xs, ys, n = [], [], 0
    for y in range(c.height):
        for x in range(c.width):
            if px[x, y] >= seuil:
                xs.append(x); ys.append(y); n += 1
    tot = c.width * c.height
    if not xs:
        print('  %-26s %s  fond=%d seuil=%d  ENCRE 0 %%  (rien au-dessus du seuil)'
              % (nom, box, fond, seuil))
        return None
    bb = (box[0] + min(xs), box[1] + min(ys), box[0] + max(xs), box[1] + max(ys))
    print('  %-26s src %dx%d  fenetre %s  fond=%3d seuil=%3d  encre %5.1f %%  '
          'bbox=(%d,%d,%d,%d)  l=%d h=%d'
          % (nom, w, h, box, fond, seuil, 100.0 * n / tot,
             bb[0], bb[1], bb[2], bb[3], bb[2] - bb[0] + 1, bb[3] - bb[1] + 1))
    return bb


def main():
    print('=== REFERENCE cadre 4 (1080 de large) ===')
    encre(REF, (100, 30, 420, 80), nom='ARGENT (libelle)')
    encre(REF, (100, 80, 500, 140), nom='montant')
    encre(REF, (780, 30, 1040, 75), nom='JOUR 12 (libelle)')
    encre(REF, (700, 75, 1040, 140), nom='phase')
    encre(REF, (0, 30, 140, 140), nom='CONTROLE NEG coin vide')

    print('\n=== JEU 1080x2400 ===')
    encre(J24, (100, 20, 420, 62), nom='ARGENT (libelle)')
    encre(J24, (100, 62, 500, 115), nom='montant')
    encre(J24, (780, 20, 1040, 60), nom='JOUR 1 (libelle)')
    encre(J24, (700, 60, 1040, 125), nom='phase')
    encre(J24, (0, 55, 150, 115), nom='ARTEFACT gris a gauche')
    encre(J24, (0, 150, 140, 230), nom='CONTROLE NEG bande noire')

    print('\n=== JEU 1080x1920 ===')
    encre(J19, (100, 20, 420, 62), nom='ARGENT (libelle)')
    encre(J19, (100, 62, 500, 115), nom='montant')
    encre(J19, (780, 20, 1040, 60), nom='JOUR 1 (libelle)')
    encre(J19, (700, 60, 1040, 125), nom='phase')
    encre(J19, (0, 55, 150, 115), nom='ARTEFACT gris a gauche')


if __name__ == '__main__':
    main()
