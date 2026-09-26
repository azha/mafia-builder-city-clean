#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M1 — profil de luminance vertical sur une colonne de bord, référence vs captures.

But : localiser les frontières horizontales (bas de la barre haute, début de l'art, haut du
panneau) et CHIFFRER la « bande sombre » signalée sous la barre haute.

La colonne est prise à x = 40 px (bord gauche, hors panneau, hors médaillon) et la luminance est
la MÉDIANE d'une fenêtre de 21 px de large — jamais un pixel (anti-crénelage).

Contrôle positif : les trois images sont larges de 1080 px, donc la colonne x=40 désigne le MÊME
point relatif dans les trois ; le script l'imprime. Contrôle négatif : la ligne du panneau (bas de
l'image) doit sortir à une luminance TRÈS différente du ciel — si tout le profil est plat,
l'instrument ne discrimine pas.
"""
import sys
from PIL import Image, ImageStat

IMAGES = {
    'REF cadre 4 (la suite)': '../reference/cadre-4-la-suite.png',
    'REF cadre 0 (rien a trancher)': '../reference/cadre-0-rien-a-trancher.png',
    'JEU 1080x1920': '../captures/p1_lancement_1080x1920.png',
    'JEU 1080x2400': '../captures/p1_lancement_1080x2400.png',
}
X = 40
DEMI = 10


def lum(im, x, y):
    box = im.crop((x - DEMI, y, x + DEMI + 1, y + 1)).convert('L')
    vals = sorted(box.getdata())
    return vals[len(vals) // 2]


def main():
    import os
    ici = os.path.dirname(os.path.abspath(__file__))
    for nom, rel in IMAGES.items():
        p = os.path.join(ici, rel)
        im = Image.open(p).convert('RGB')
        print('\n=== %s — %s %dx%d ===' % (nom, os.path.basename(p), im.size[0], im.size[1]))
        prof = [(y, lum(im, X, y)) for y in range(0, min(im.size[1], 420), 2)]
        # impression compacte : on ne garde que les y ou la luminance CHANGE de plus de 3
        prec = None
        for y, v in prof:
            if prec is None or abs(v - prec) >= 3:
                print('  y=%4d  L=%3d' % (y, v))
                prec = v
        print('  --- bas de l image ---')
        for y in range(im.size[1] - 40, im.size[1], 8):
            print('  y=%4d  L=%3d' % (y, lum(im, X, y)))


if __name__ == '__main__':
    main()
