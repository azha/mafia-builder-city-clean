#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M7 — reprise de M6 avec un seuil ABSOLU, parce que le seuil dérivé mesurait l'art, pas le texte.

M6 dérivait son seuil de la médiane de la fenêtre + 40. Dans une fenêtre qui contient de l'art
peint (référence) ou la carte (jeu), ce seuil tombe DANS l'art : toutes les bbox sortaient
« tronquées », c'est-à-dire que l'instrument mesurait le fond. C'est le cas d'école du résultat
UNIFORME (ici : « tout est tronqué ») qui accuse l'instrument.

Ici le seuil est ABSOLU à L>=120 : le chrome haut est à L≈13..20, l'art le plus clair de la zone
haute à L≈70, le texte du chrome à L>=150. Le script imprime, pour chaque fenêtre, le taux
d'encre ET le fait que la bbox touche ou non un bord — une bbox collée reste refusée.

Contrôle positif : ARGENT est le MÊME mot dans les deux images, en capitales, dans une zone
sombre des deux côtés ⇒ la comparaison est directe (les deux images font 1080 de large).
Contrôle négatif : une fenêtre de chrome sans texte doit rendre 0 % d'encre.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
IM = {
    'REF': os.path.join(ICI, '../reference/cadre-4-la-suite.png'),
    'J24': os.path.join(ICI, '../captures/p1_lancement_1080x2400.png'),
    'J19': os.path.join(ICI, '../captures/p1_lancement_1080x1920.png'),
}
SEUIL = 120


def bbox(cle, box, nom):
    im = Image.open(IM[cle]).convert('L')
    c = im.crop(box); px = c.load()
    xs, ys, n = [], [], 0
    for y in range(c.height):
        for x in range(c.width):
            if px[x, y] >= SEUIL:
                xs.append(x); ys.append(y); n += 1
    if not xs:
        print('  %-5s %-30s %s  ENCRE 0 %%' % (cle, nom, box)); return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    colle = [s for s, t in (('G', x0 == 0), ('D', x1 == c.width - 1),
                            ('H', y0 == 0), ('B', y1 == c.height - 1)) if t]
    print('  %-5s %-30s src %dx%d  encre %4.1f %%  bbox=(%4d,%4d,%4d,%4d)  l=%3d h=%3d  %s'
          % (cle, nom, im.size[0], im.size[1], 100.0 * n / (c.width * c.height),
             box[0] + x0, box[1] + y0, box[0] + x1, box[1] + y1,
             x1 - x0 + 1, y1 - y0 + 1,
             ('TRONQUEE:' + ''.join(colle)) if colle else 'OK'))
    return (box[0] + x0, box[1] + y0, box[0] + x1, box[1] + y1)


def main():
    print('seuil absolu L >= %d\n' % SEUIL)
    print('--- ARGENT : meme mot, meme casse, meme largeur d image ---')
    bbox('REF', (40, 25, 500, 80), 'ARGENT')
    bbox('J24', (40, 10, 500, 58), 'ARGENT')
    bbox('J19', (40, 10, 500, 58), 'ARGENT')
    print('\n--- montant ---')
    bbox('REF', (40, 70, 620, 155), 'montant 24 850 EUR')
    bbox('J24', (150, 55, 620, 130), 'montant 10 000 EUR (x>=150, hors artefact)')
    print('\n--- JOUR n ---')
    bbox('REF', (700, 25, 1060, 76), 'JOUR 12')
    bbox('J24', (700, 10, 1060, 56), 'JOUR 1')
    print('\n--- phase ---')
    bbox('REF', (700, 76, 1060, 160), 'Plein jour')
    bbox('J24', (700, 56, 1060, 130), 'Aube')
    print('\n--- premiere capitale isolee (fenetre posee sur UN glyphe) ---')
    bbox('REF', (818, 74, 850, 135), 'P de Plein')
    bbox('J24', (928, 60, 966, 110), 'A de Aube')
    bbox('REF', (86, 36, 116, 74), 'A de ARGENT')
    bbox('J24', (84, 20, 114, 54), 'A de ARGENT')
    print('\n--- artefact gris a gauche du montant ---')
    bbox('J24', (0, 40, 152, 130), 'artefact (x<152)')
    bbox('J19', (0, 40, 152, 130), 'artefact (x<152)')
    bbox('REF', (0, 55, 152, 150), 'CONTROLE NEG : meme zone en reference')
    print('\n--- controle negatif : chrome sans texte ---')
    bbox('J24', (560, 10, 700, 50), 'CONTROLE NEG chrome vide (jeu)')


if __name__ == '__main__':
    main()
