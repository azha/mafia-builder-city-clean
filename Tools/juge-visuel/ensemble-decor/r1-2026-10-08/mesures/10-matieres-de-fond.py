#!/usr/bin/env python3
"""M10 - MATIERES DE FOND etrangeres aux maquettes.
Trois masques de couleur, chacun sur TOUTES les planches (donc on voit si la
matiere est propre a un ecran ou partagee) :
  FEUTRINE  : G > R+18 et G > B+12 et G > 45     (le vert de E11)
  KRAFT     : R > 95 et R-B > 38 et G < R        (le brun de E04/E09)
  VOILE     : 36 <= moyenne <= 60 et |R-B| < 14  (le gris-bleu de E08)
Pour chaque masque : part de la surface de l'image, et bbox.
Controle NEGATIF : les ecrans sombres doivent rendre ~0 % sur les trois.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
NOMS = ['A01_AccueilFile2Cartes', 'E01_Journal', 'E02_Carnet', 'E03_Chanedappro',
        'E04_Distribution', 'E05_Loi', 'E06_Dmolition', 'E07_Boutique',
        'E08_Lasemaine', 'E09_Inspections', 'E10_Filire', 'E11_DecisionDetail']


def masques(p):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    print(f'IMAGE {p.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    acc = {'FEUTRINE': [], 'KRAFT': [], 'VOILE': []}
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            m = (r + g + b) / 3
            if g > r + 18 and g > b + 12 and g > 45:
                acc['FEUTRINE'].append((x, y))
            elif r > 95 and r - b > 38 and g < r:
                acc['KRAFT'].append((x, y))
            elif 36 <= m <= 60 and abs(r - b) < 14:
                acc['VOILE'].append((x, y))
    tot = (w // 4) * (h // 4)
    out = {}
    for k, v in acc.items():
        if not v:
            out[k] = (0.0, None); continue
        xs = [a for a, _ in v]; ys = [b for _, b in v]
        out[k] = (100 * len(v) / tot, (min(xs), min(ys), max(xs), max(ys)))
    return out, (w, h)


print(f'{"ecran":26s} {"FEUTRINE":>9s} {"KRAFT":>8s} {"VOILE":>8s}   bbox de la matiere dominante')
for n in NOMS:
    o, (w, h) = masques(f'{CAP}{n}_1080x2400.png')
    dom = max(o.items(), key=lambda kv: kv[1][0])
    print(f'  {n:24s} {o["FEUTRINE"][0]:7.1f} % {o["KRAFT"][0]:6.1f} % '
          f'{o["VOILE"][0]:6.1f} %   {dom[0]} {dom[1][1]}')
