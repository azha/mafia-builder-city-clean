#!/usr/bin/env python3
"""M12 - trois mesures d'ENSEMBLE sur les 12 planches 2400 :
  (a) DECOR : luminance mediane et couleur mediane de la bande y 250..420,
      qui est du decor sur les douze (le corps commence plus bas partout) ;
  (b) DOCK : bbox des 4 pastilles (gris-bleu rond) dans les 300 dernieres lignes,
      plus la base des libelles -> controle positif d'identite du chrome bas ;
  (c) OR : part de px 'or' dans le CORPS (y 430..H-300), pour voir si un ecran
      a perdu son or (E08 : l'arc de tension de la maquette est en or).
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
NOMS = ['A01_AccueilFile2Cartes', 'E01_Journal', 'E02_Carnet', 'E03_Chanedappro',
        'E04_Distribution', 'E05_Loi', 'E06_Dmolition', 'E07_Boutique',
        'E08_Lasemaine', 'E09_Inspections', 'E10_Filire', 'E11_DecisionDetail']


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def mesure(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    dec = [px[x, y] for y in range(250, 421, 3) for x in range(10, w - 10, 6)]
    L = sorted(lum(p) for p in dec)
    cm = tuple(sorted(p[i] for p in dec)[len(dec) // 2] for i in range(3))
    # dock : pastilles
    ds = [(x, y) for y in range(h - 300, h - 60, 2) for x in range(0, w, 2)
          if 25 < px[x, y][2] < 80 and px[x, y][2] - px[x, y][0] > 8]
    db = (min(a for a, _ in ds), min(b for _, b in ds),
          max(a for a, _ in ds), max(b for _, b in ds)) if ds else None
    # or dans le corps
    tot = n = 0
    for y in range(430, h - 300, 3):
        for x in range(10, w - 10, 3):
            r, g, b = px[x, y]
            tot += 1
            if r > 130 and r - b > 55 and g > 95:
                n += 1
    return L[len(L) // 2], cm, db, 100.0 * n / tot


print(f'{"ecran":26s} {"L_decor":>8s}  decor median      dock bbox              '
      f'{"or_corps":>8s}')
for nm in NOMS:
    L, cm, db, orp = mesure(f'{CAP}{nm}_1080x2400.png')
    print(f'  {nm:24s} {L:8.4f}  {cm!s:16s}  {db!s:22s} {orp:7.2f} %')
