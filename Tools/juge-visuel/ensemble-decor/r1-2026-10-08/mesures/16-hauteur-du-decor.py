#!/usr/bin/env python3
"""M16 - HAUTEUR DE LA BANDE DE DECOR (le sujet de ce juge).
Le decor est une image : ses lignes ont une TEXTURE horizontale. L'UI qui le
suit est plate. On mesure, par ligne, l'ecart-type horizontal ; le decor s'arrete
a la premiere ligne >= 240 apres laquelle 60 lignes consecutives sont plates
(ecart-type < 7) OU la matiere change franchement de teinte.
On donne la hauteur en px et en % de la hauteur de l'image.
Controle : la MEME mesure sur les references, qui portent le meme decor.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def texture(path, nom, y0=240):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    sd = {}
    for y in range(y0, min(h - 300, 1500)):
        v = [sum(px[x, y]) / 3 for x in range(12, w - 12, 6)]
        m = sum(v) / len(v)
        sd[y] = (sum((t - m) ** 2 for t in v) / len(v)) ** 0.5
    fin = None
    for y in range(y0, min(h - 360, 1440)):
        if all(sd[t] < 7 for t in range(y, y + 60)):
            fin = y
            break
    if fin is None:
        fin = min(h - 300, 1500)
    print(f'  {nom:30s} decor s arrete a y={fin}  => {fin} px, {100*fin/h:.1f} % '
          f'de la hauteur (sd a y=250 : {sd[250]:.1f})')
    return fin


NOMS = ['A01_AccueilFile2Cartes', 'E01_Journal', 'E02_Carnet', 'E03_Chanedappro',
        'E04_Distribution', 'E05_Loi', 'E06_Dmolition', 'E07_Boutique',
        'E08_Lasemaine', 'E09_Inspections', 'E10_Filire', 'E11_DecisionDetail']
print('--- CAPTURES 1080x2400 ---')
for n in NOMS:
    texture(f'{CAP}{n}_1080x2400.png', n)
print('--- REFERENCES (le decor y est le meme sujet) ---')
for n, f in [('ref E09 (cadre 31)', 'police/reference-⑮-1080x2102.png'),
             ('ref E01 (cadre 125)', 'screen_c1/reference-1080x2102.png'),
             ('ref E04 (cadre 54)', 'ecran_distribution/reference-1080x2102.png'),
             ('ref A01 (cadre 5)', 'ensemble-decor/r1-2026-10-08/reference/'
                                   'cadre-5-tete-sur-ligne-haute.png')]:
    texture(RC + f, n)
