#!/usr/bin/env python3
"""M3 - TROUS et FOND. Pour chaque planche :
  - profil d'encre par ligne : part des px de la ligne qui s'ecartent de la MEDIANE
    de la ligne de plus de 24/255 sur un canal (donc : du contenu, pas un aplat) ;
  - plus long intervalle vertical CONSECUTIF a encre < 1,5 % dans le corps
    (y de 430 a H-300, donc hors chrome haut et hors dock) : c'est le TROU ;
  - couleur mediane du fond a l'interieur de ce trou ;
  - part de la hauteur utile que le trou occupe.

Controle POSITIF : une planche DENSE (E07 boutique) doit rendre un trou court.
Controle NEGATIF : une planche a trou connu (E11) doit rendre un trou long.
Si les deux sortent pareil, l'instrument ne mesure rien.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
NOMS = ['A01_AccueilFile2Cartes', 'A01_AccueilFile2Cartes_TeteRaisonLongue',
        'E01_Journal', 'E02_Carnet', 'E03_Chanedappro', 'E04_Distribution',
        'E05_Loi', 'E06_Dmolition', 'E07_Boutique', 'E08_Lasemaine',
        'E09_Inspections', 'E10_Filire', 'E11_DecisionDetail']


def med3(vals):
    out = []
    for i in range(3):
        c = sorted(v[i] for v in vals)
        out.append(c[len(c) // 2])
    return tuple(out)


def analyse(path, y0=430, ymargin=300):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    xs = list(range(20, w - 20, 4))
    ink, medc = {}, {}
    y1 = h - ymargin
    for y in range(y0, y1):
        row = [px[x, y] for x in xs]
        m = med3(row)
        n = sum(1 for p in row if max(abs(p[i] - m[i]) for i in range(3)) > 24)
        ink[y] = n / len(row)
        medc[y] = m
    best, cur = (0, None, None), None
    for y in range(y0, y1):
        if ink[y] < 0.015:
            if cur is None:
                cur = y
        else:
            if cur is not None and y - cur > best[0]:
                best = (y - cur, cur, y - 1)
            cur = None
    if cur is not None and y1 - cur > best[0]:
        best = (y1 - cur, cur, y1 - 1)
    ln, a, b = best
    col = med3([medc[y] for y in range(a, b + 1)]) if a else None
    return w, h, ln, a, b, col, (y1 - y0)


print('ecran           trou_px  de..a        %corps  fond mediane du trou')
for n in NOMS:
    for res in ('1080x2400',):
        w, h, ln, a, b, col, util = analyse(f'{CAP}{n}_{res}.png')
        print(f'  {n:38s} {ln:5d}  {a}..{b}  {100*ln/util:5.1f} %  {col}')
