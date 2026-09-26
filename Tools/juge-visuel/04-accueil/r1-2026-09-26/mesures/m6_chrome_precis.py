#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M6 — mesures précises du chrome haut : bbox d'encre sur fenêtres GÉNÉREUSES + première capitale.

Corrige deux défauts de M4/M5 : (a) les fenêtres coupaient l'encre (bbox collée au bord de la
fenêtre) ; (b) la segmentation en glyphes fusionnait les lettres qui se touchent. Ici chaque
fenêtre est volontairement plus grande que son contenu et le script REFUSE la mesure si la bbox
touche un bord de la fenêtre (c'est le contrôle : une bbox collée au bord est une mesure tronquée).

La « première capitale » est isolée par une fenêtre en X posée sur ce seul glyphe, choisie d'après
la bbox de la ligne — sa largeur est imprimée pour qu'on voie qu'elle n'a pris qu'une lettre.
"""
import os, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
IM = {
    'REF': os.path.join(ICI, '../reference/cadre-4-la-suite.png'),
    'J24': os.path.join(ICI, '../captures/p1_lancement_1080x2400.png'),
    'J19': os.path.join(ICI, '../captures/p1_lancement_1080x1920.png'),
}


def bbox(cle, box, nom, marge=40):
    im = Image.open(IM[cle]).convert('L')
    c = im.crop(box); px = c.load()
    vals = sorted(c.getdata()); seuil = vals[len(vals) // 2] + marge
    xs, ys = [], []
    for y in range(c.height):
        for x in range(c.width):
            if px[x, y] >= seuil:
                xs.append(x); ys.append(y)
    if not xs:
        print('  %-5s %-28s %s  seuil=%d  AUCUNE ENCRE' % (cle, nom, box, seuil)); return None
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    colle = []
    if x0 == 0: colle.append('gauche')
    if x1 == c.width - 1: colle.append('droite')
    if y0 == 0: colle.append('haut')
    if y1 == c.height - 1: colle.append('bas')
    print('  %-5s %-28s src %dx%d  seuil=%3d  bbox=(%4d,%4d,%4d,%4d)  l=%3d h=%3d %s'
          % (cle, nom, im.size[0], im.size[1], seuil,
             box[0] + x0, box[1] + y0, box[0] + x1, box[1] + y1,
             x1 - x0 + 1, y1 - y0 + 1,
             ('⛔ TRONQUEE (' + ','.join(colle) + ')') if colle else 'OK'))
    return (box[0] + x0, box[1] + y0, box[0] + x1, box[1] + y1)


def main():
    print('--- libelles et valeurs du chrome (fenetres generees larges) ---')
    bbox('REF', (60, 25, 480, 80), 'ARGENT')
    bbox('J24', (60, 12, 480, 58), 'ARGENT')
    bbox('J19', (60, 12, 480, 58), 'ARGENT')
    print()
    bbox('REF', (60, 78, 600, 150), 'montant (ligne)')
    bbox('J24', (160, 58, 600, 130), 'montant (ligne, apres artefact)')
    print()
    bbox('REF', (740, 25, 1060, 76), 'JOUR n')
    bbox('J24', (740, 12, 1060, 56), 'JOUR n')
    print()
    bbox('REF', (740, 76, 1060, 160), 'phase (ligne)')
    bbox('J24', (740, 58, 1060, 130), 'phase (ligne)')
    print()
    print('--- premiere capitale isolee ---')
    bbox('REF', (818, 74, 848, 130), 'P de "Plein jour"')
    bbox('J24', (930, 60, 962, 110), 'A de "Aube"')
    bbox('REF', (88, 38, 114, 72), 'A de "ARGENT"')
    bbox('J24', (86, 20, 112, 52), 'A de "ARGENT"')
    print()
    print('--- artefact gris a gauche du montant (JEU seulement) ---')
    bbox('J24', (0, 45, 160, 125), 'artefact')
    bbox('J19', (0, 45, 160, 125), 'artefact')
    bbox('REF', (0, 60, 160, 150), 'CONTROLE : meme zone en reference')


if __name__ == '__main__':
    main()
