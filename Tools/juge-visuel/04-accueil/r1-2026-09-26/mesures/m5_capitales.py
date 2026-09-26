#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M5 — hauteur de CAPITALE, glyphe par glyphe, sur des fenêtres GÉNÉREUSES.

Pourquoi glyphe par glyphe : « Plein jour » a un jambage (j) et « Aube » n'en a pas ; comparer les
bbox de lignes entières compare des grandeurs différentes. On isole donc la PREMIÈRE capitale de
chaque texte et on mesure sa hauteur d'encre — c'est ce que l'œil lit.

Méthode : dans une fenêtre large, on segmente en colonnes d'encre (seuil dérivé = médiane + 40),
on isole le PREMIER groupe de colonnes contiguës (= le premier glyphe), et on rend sa bbox.
Le script imprime le nombre de glyphes trouvés : si ce compte ne correspond pas au mot attendu,
la segmentation a échoué et la mesure ne vaut rien — c'est le contrôle.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(ICI, '../reference/cadre-4-la-suite.png')
J24 = os.path.join(ICI, '../captures/p1_lancement_1080x2400.png')


def glyphes(path, box, nom, attendus=None, trou=3):
    im = Image.open(path).convert('L')
    c = im.crop(box); px = c.load()
    vals = sorted(c.getdata()); seuil = vals[len(vals) // 2] + 40
    cols = []
    for x in range(c.width):
        cols.append(any(px[x, y] >= seuil for y in range(c.height)))
    groupes, deb = [], None
    vide = 0
    for x in range(c.width):
        if cols[x]:
            if deb is None:
                deb = x
            vide = 0
        else:
            if deb is not None:
                vide += 1
                if vide > trou:
                    groupes.append((deb, x - vide)); deb = None; vide = 0
    if deb is not None:
        groupes.append((deb, c.width - 1))
    print('  %-30s src %dx%d  fenetre %s  seuil=%d  glyphes=%d%s'
          % (nom, im.size[0], im.size[1], box, seuil, len(groupes),
             ('  (attendus %d)' % attendus) if attendus else ''))
    res = []
    for i, (a, b) in enumerate(groupes):
        ys = [y for y in range(c.height) for x in range(a, b + 1) if px[x, y] >= seuil]
        if not ys:
            continue
        res.append((box[0] + a, box[0] + b, box[1] + min(ys), box[1] + max(ys)))
        if i < 3 or i == len(groupes) - 1:
            print('      g%-2d x=%4d..%-4d  y=%4d..%-4d  l=%3d  h=%3d'
                  % (i, box[0] + a, box[0] + b, box[1] + min(ys), box[1] + max(ys),
                     b - a + 1, max(ys) - min(ys) + 1))
    if res:
        print('      -> chasse totale (1er a dernier) = %d px' % (res[-1][1] - res[0][0] + 1))
    return res


def main():
    print('=== REFERENCE cadre 4 (1080x2102) ===')
    glyphes(REF, (90, 30, 460, 78), 'ARGENT (libelle)', 6)
    glyphes(REF, (90, 78, 560, 150), 'montant 24 850 EUR', 8)
    glyphes(REF, (760, 28, 1050, 76), 'JOUR 12', 6)
    glyphes(REF, (760, 76, 1050, 150), 'phase Plein jour', 10)

    print('\n=== JEU 1080x2400 ===')
    glyphes(J24, (90, 18, 460, 60), 'ARGENT (libelle)', 6)
    glyphes(J24, (155, 58, 560, 120), 'montant 10 000 EUR (sans artefact)', 7)
    glyphes(J24, (760, 18, 1050, 58), 'JOUR 1', 5)
    glyphes(J24, (760, 58, 1050, 120), 'phase Aube', 4)


if __name__ == '__main__':
    main()
