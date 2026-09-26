#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""M3 — découpes (crops) pour l'inventaire visuel, référence et captures.

Ne mesure rien : produit des vignettes agrandies pour que le juge DÉCRIVE les parties. Chaque
sortie imprime la taille de la source et la boîte prise.
"""
import os, sys
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ICI, 'decoupes')
os.makedirs(OUT, exist_ok=True)

SRC = {
    'ref4': '../reference/cadre-4-la-suite.png',
    'ref0': '../reference/cadre-0-rien-a-trancher.png',
    'j19': '../captures/p1_lancement_1080x1920.png',
    'j24': '../captures/p1_lancement_1080x2400.png',
}

# (cle, nom, boite, zoom)
DECOUPES = [
    ('ref4', 'chrome-haut', (0, 0, 1080, 420), 1.0),
    ('j24',  'chrome-haut', (0, 0, 1080, 420), 1.0),
    ('j19',  'chrome-haut', (0, 0, 1080, 420), 1.0),
    ('ref4', 'panneau', (0, 690, 1080, 1580), 1.0),
    ('j24',  'panneau', (0, 1040, 1080, 1560), 1.4),
    ('ref4', 'dock', (0, 1580, 1080, 2102), 1.0),
    ('j24',  'dock', (0, 1880, 1080, 2400), 1.0),
    ('j19',  'dock', (0, 1400, 1080, 1920), 1.0),
]


def main():
    for cle, nom, box, z in DECOUPES:
        p = os.path.join(ICI, SRC[cle])
        im = Image.open(p).convert('RGB')
        c = im.crop(box)
        if z != 1.0:
            c = c.resize((int(c.width * z), int(c.height * z)), Image.LANCZOS)
        dest = os.path.join(OUT, '%s_%s.png' % (cle, nom))
        c.save(dest)
        print('%-5s %-12s source %dx%d  boite %s  -> %s %dx%d'
              % (cle, nom, im.size[0], im.size[1], box, os.path.basename(dest), c.width, c.height))


if __name__ == '__main__':
    main()
