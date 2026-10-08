#!/usr/bin/env python3
"""M15 - les CTA principaux des huit ecrans qui en ont un (planches 2400).
On rend, pour la fenetre du libelle : la couleur de l'ENCRE (mediane des 5 %
de px les plus clairs) et celle du FOND (mediane des 60 % les plus sombres),
plus le contraste WCAG. Sert a dire si deux CTA 'eteints' le sont de la MEME
facon, et si les 'allumes' partagent le meme or.
Controle positif : les CTA or doivent rendre la meme famille de teinte.
"""
from PIL import Image

CAP = ('/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
       'planches-par-ecran-2026-10-08-client2-mots/')


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


CAS = [
    ('E01 "Y PRETER ATTENTION"', 'E01_Journal_1080x2400.png', (330, 1952, 760, 1982)),
    ('E02 "Lancer la soiree"', 'E02_Carnet_1080x2400.png', (130, 1992, 480, 2026)),
    ('E03 "EN COMMANDER"', 'E03_Chanedappro_1080x2400.png', (90, 2026, 440, 2058)),
    ('E05 "LUI TROUVER UN AVOCAT"', 'E05_Loi_1080x2400.png', (88, 1990, 450, 2022)),
    ('E06 "VOIR CE QUI COUTE LE PLUS"', 'E06_Dmolition_1080x2400.png', (88, 1988, 570, 2020)),
    ('E10 "BLANCHIR"', 'E10_Filire_1080x2400.png', (85, 1988, 300, 2020)),
    ('E04 "ACHETER UN RELAIS"', 'E04_Distribution_1080x2400.png', (85, 2062, 520, 2096)),
    ('A01 "LIRE MAINTENANT"', 'A01_AccueilFile2Cartes_1080x2400.png', (345, 1560, 740, 1595)),
]

for nom, f, (x0, y0, x1, y1) in CAS:
    im = Image.open(CAP + f).convert('RGB')
    print(f'IMAGE {f}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    ps = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    ps.sort(key=lum)
    n = len(ps)
    # l'ENCRE est la minorite : on prend le cote minoritaire (3 % extremes)
    fond = ps[int(0.50 * n)]
    enc = ps[int(0.97 * n)] if lum(ps[int(0.97*n)]) - lum(fond) > lum(fond) - lum(ps[int(0.03*n)]) else ps[int(0.03 * n)]
    hi, lo = max(lum(enc), lum(fond)), min(lum(enc), lum(fond))
    print(f'  {nom:33s} encre={enc!s:16s} fond={fond!s:16s} '
          f'contraste={(hi+0.05)/(lo+0.05):5.2f}:1')
