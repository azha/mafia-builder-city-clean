#!/usr/bin/env python3
"""M5 - GOUTTIERE. Doctrine : le contenu d'ecran reste dans le rect du fond ;
seul le chrome (bandeau haut, dock bas) traverse.
On echantillonne la mediane d'une fenetre 9x9 :
  - au bord GAUCHE (x=8) et DROIT (x=1071) a trois hauteurs du corps ;
  - DERRIERE le dock (y = H-60), a gauche du premier pastille (x=60).
Si la matiere du corps (kraft, feutrine) se lit a ces points, le corps traverse.
Controle positif : E01/E02 (corps sombre) doivent rendre un fond sombre partout.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
NOMS = ['A01_AccueilFile2Cartes', 'E01_Journal', 'E02_Carnet', 'E03_Chanedappro',
        'E04_Distribution', 'E05_Loi', 'E06_Dmolition', 'E07_Boutique',
        'E08_Lasemaine', 'E09_Inspections', 'E10_Filire', 'E11_DecisionDetail']


def med(px, cx, cy, k=4):
    v = [px[x, y] for y in range(cy - k, cy + k + 1) for x in range(cx - k, cx + k + 1)]
    return tuple(sorted(p[i] for p in v)[len(v) // 2] for i in range(3))


print('ecran            bordG@900  bordD@900  bordG@1600 bordD@1600 derriere-dock@H-60  sous-dock@H-14')
for n in NOMS:
    p = f'{CAP}{n}_1080x2400.png'
    im = Image.open(p).convert('RGB')
    w, h = im.size
    print(f'IMAGE {p.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    print(f'  {n:24s} {med(px,8,900)!s:>15} {med(px,1071,900)!s:>15} '
          f'{med(px,8,1600)!s:>15} {med(px,1071,1600)!s:>15} '
          f'{med(px,60,h-60)!s:>15} {med(px,540,h-14)!s:>15}')
