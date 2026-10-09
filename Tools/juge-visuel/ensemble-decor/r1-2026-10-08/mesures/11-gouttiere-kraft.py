#!/usr/bin/env python3
"""M11 - GOUTTIERE du panneau kraft de E04 : la maquette l'encadre et le rentre,
le jeu le met-il a fond perdu ? On lit, sur une ligne au milieu du kraft, le
premier et le dernier x 'kraft', et la couleur a x=2 et x=1077.
Les deux images font 1080 px de large : X directement comparable.
Controle positif : la TEINTE du kraft doit etre proche des deux cotes.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def bord(path, y, nom):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    xs = [x for x in range(0, im.size[0])
          if px[x, y][0] > 95 and px[x, y][0] - px[x, y][2] > 38 and px[x, y][1] < px[x, y][0]]
    print(f'  {nom:34s} y={y}  kraft de x={min(xs)} a x={max(xs)}  '
          f'(largeur {max(xs)-min(xs)+1} px)  px[2]={px[2,y]}  px[1077]={px[1077,y]}  '
          f'teinte au centre={px[540,y]}')


print('--- E04 : panneau kraft ---')
bord(RC + 'ecran_distribution/reference-1080x2102.png', 1000, 'REFERENCE (cadre 54)')
bord(CAP + 'E04_Distribution_1080x2400.png', 1000, 'CAPTURE 2400')
print('--- E09 : champ kraft (absent de la maquette) ---')
bord(CAP + 'E09_Inspections_1080x2400.png', 1400, 'CAPTURE 2400')
