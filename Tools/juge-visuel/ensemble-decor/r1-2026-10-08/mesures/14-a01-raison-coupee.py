#!/usr/bin/env python3
"""M14 - A01 : la raison de la carte de file est-elle coupee ?
Une seule variable change entre les deux planches : la LONGUEUR de la raison
(journal : 2 lignes vs 3 lignes). On compte les LIGNES DE TEXTE de la carte en
projetant l'encre par ligne, et on donne la hauteur libre restante sous la
derniere ligne, a l'interieur du cadre de la carte.
Controle positif : la variante COURTE doit rendre 2 lignes de citation et finir
par un guillemet fermant ; si les deux variantes rendent la meme chose,
l'instrument ne mesure rien.
"""
from PIL import Image

CAP = ('/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
       'planches-par-ecran-2026-10-08-client2-mots/')


def lignes(path, x0, x1, y0, y1, nom):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    prof = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if sum(px[x, y]) / 3 > 95)
        prof.append((y, n))
    bands, cur = [], None
    for y, n in prof:
        if n >= 3 and cur is None:
            cur = y
        elif n < 3 and cur is not None:
            if y - cur >= 6:
                bands.append((cur, y - 1))
            cur = None
    if cur is not None:
        bands.append((cur, y1 - 1))
    print(f'  {nom}')
    for i, (a, b) in enumerate(bands, 1):
        xs = [x for y in range(a, b + 1) for x in range(x0, x1)
              if sum(px[x, y]) / 3 > 95]
        print(f'    ligne {i}: y {a}..{b} (h={b-a+1})  encre x {min(xs)}..{max(xs)}')
    print(f'    dernieres lignes a y={bands[-1][1]} ; bas du cadre y={y1} ; '
          f'vide restant = {y1 - bands[-1][1]} px')
    return bands


# cadre de la carte de file : x 48..1032, y 1735..2095 (lu sur les deux planches)
lignes(CAP + 'A01_AccueilFile2Cartes_1080x2400.png', 70, 1000, 1745, 2090,
       'VARIANTE COURTE (journal : raison sur 2 lignes)')
lignes(CAP + 'A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png', 70, 1000, 1745, 2090,
       'VARIANTE LONGUE (journal : raison sur 3 lignes)')
