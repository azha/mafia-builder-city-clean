#!/usr/bin/env python3
"""M1 - Chrome d'ensemble : manometre (bbox de l'or), hauteur de capitale d'ARGENT,
or echantillonne, et or de reference. Tourne sur les 12 captures 2400 + 2 references.
Imprime la taille de chaque image ouverte.

Controle POSITIF attendu : l'or du manometre est le meme jeton sur captures et references.
Controle NEGATIF attendu : le diametre du manometre differe entre reference et capture
(sinon l'instrument ne discrimine pas).
"""
import os
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'

CAPTURES = [
    ('A01', 'A01_AccueilFile2Cartes_1080x2400.png'),
    ('A01L', 'A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png'),
    ('E01', 'E01_Journal_1080x2400.png'),
    ('E02', 'E02_Carnet_1080x2400.png'),
    ('E03', 'E03_Chanedappro_1080x2400.png'),
    ('E04', 'E04_Distribution_1080x2400.png'),
    ('E05', 'E05_Loi_1080x2400.png'),
    ('E06', 'E06_Dmolition_1080x2400.png'),
    ('E07', 'E07_Boutique_1080x2400.png'),
    ('E08', 'E08_Lasemaine_1080x2400.png'),
    ('E09', 'E09_Inspections_1080x2400.png'),
    ('E10', 'E10_Filire_1080x2400.png'),
    ('E11', 'E11_DecisionDetail_1080x2400.png'),
]
REFS = [
    ('ref-A01c5', 'ensemble-decor/r1-2026-10-08/reference/cadre-5-tete-sur-ligne-haute.png'),
    ('ref-E01', 'screen_c1/reference-1080x2102.png'),
    ('ref-E03', 'ecran_appro/reference-1080x2102.png'),
    ('ref-E10', 'screen_c2/reference-1080x2102.png'),
]


def gold_bbox(im, y0, y1, x0=330, x1=750):
    """bbox des pixels 'or vif' (anneau du manometre) dans la fenetre donnee."""
    px = im.load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if r > 115 and r - b > 45 and g > 80:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


def cap_height(im, x0, x1, y0, y1, thr=90):
    """hauteur d'encre claire (texte clair sur fond sombre) dans la fenetre."""
    px = im.load()
    rows = []
    for y in range(y0, y1):
        n = sum(1 for x in range(x0, x1) if sum(px[x, y]) / 3 > thr)
        rows.append((y, n))
    on = [y for y, n in rows if n >= 2]
    if not on:
        return None
    return (min(on), max(on), max(on) - min(on) + 1)


def median_window(im, cx, cy, half=6):
    px = im.load()
    vals = [px[x, y] for y in range(cy - half, cy + half + 1)
            for x in range(cx - half, cx + half + 1)]
    out = []
    for i in range(3):
        c = sorted(v[i] for v in vals)
        out.append(c[len(c) // 2])
    return tuple(out)


print('=== M1 chrome d ensemble ===')
print('--- CAPTURES (1080x2400) ---')
for key, f in CAPTURES:
    im = Image.open(CAP + f).convert('RGB')
    print(f'IMAGE {f}  taille={im.size[0]}x{im.size[1]}')
    bb = gold_bbox(im, 10, 230)
    ch = cap_height(im, 30, 160, 20, 55)   # "ARGENT"
    print(f'  {key:5s} manometre bbox={bb} '
          f'diam_x={bb[2]-bb[0]+1 if bb else None} '
          f'ARGENT cap={ch}')
print('--- REFERENCES (1080x2102, x3.6 comme les captures) ---')
for key, f in REFS:
    im = Image.open(RC + f).convert('RGB')
    print(f'IMAGE {f}  taille={im.size[0]}x{im.size[1]}')
    bb = gold_bbox(im, 5, 260)
    print(f'  {key:10s} manometre bbox={bb} diam_x={bb[2]-bb[0]+1 if bb else None}')

print('--- jeton OR (controle positif) : mediane 13x13 sur un filet or ---')
im = Image.open(RC + 'screen_c1/reference-1080x2102.png').convert('RGB')
print(f'IMAGE screen_c1/reference-1080x2102.png taille={im.size}')
print('  ref E01 filet sous le titre (y=640) :', median_window(im, 540, 641, 3))
im = Image.open(CAP + 'E01_Journal_1080x2400.png').convert('RGB')
print(f'IMAGE E01_Journal_1080x2400.png taille={im.size}')
print('  cap E01 filet sous le titre (y=720) :', median_window(im, 540, 721, 3))
