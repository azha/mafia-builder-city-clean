#!/usr/bin/env python3
"""M2 - diametre du manometre, en rejetant la ligne de filet or pleine largeur.
Methode : par ligne y, compter les px or ; une ligne dont le compte depasse 300
est le filet (pleine largeur) et n'est pas l'anneau. Le diametre est le max des
largeurs (xmax-xmin) des lignes retenues.
Controle positif : le jeton or (176,141,6x) est le meme partout (cf 01).
Controle negatif attendu : captures != references nominales si la taille differe.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'

FILES = [('cap ' + k, CAP + f) for k, f in [
    ('A01', 'A01_AccueilFile2Cartes_1080x2400.png'),
    ('E01', 'E01_Journal_1080x2400.png'),
    ('E05', 'E05_Loi_1080x2400.png'),
    ('E08', 'E08_Lasemaine_1080x2400.png'),
    ('E11', 'E11_DecisionDetail_1080x2400.png'),
]] + [('ref ' + k, RC + f) for k, f in [
    ('A01-cadre5', 'ensemble-decor/r1-2026-10-08/reference/cadre-5-tete-sur-ligne-haute.png'),
    ('E01', 'screen_c1/reference-1080x2102.png'),
    ('E08-v4-29(x3.0)', 'compression/v4-29.png'),
    ('E11', 'decision-du-jour/reference-1080x2102.png'),
]]

for key, path in FILES:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    best = None
    ytop, ybot = None, None
    for y in range(0, 300):
        xs = [x for x in range(380, 701)
              if px[x, y][0] > 115 and px[x, y][0] - px[x, y][2] > 45 and px[x, y][1] > 80]
        if not xs:
            continue
        wdt = max(xs) - min(xs) + 1
        # un filet pleine largeur est DENSE (count ~ span) ; un anneau ne l'est pas
        if wdt > 40 and len(xs) / wdt > 0.6:
            continue
        if ytop is None:
            ytop = y
        ybot = y
        if best is None or wdt > best[0]:
            best = (wdt, y, min(xs), max(xs))
    fac = 3.0 if 'x3.0' in key else 3.6
    print(f'  {key:20s} diam_px={best[0]:4d} a y={best[1]:3d} '
          f'[x {best[2]}..{best[3]}]  anneau y {ytop}..{ybot}  '
          f'=> diam_CSS={best[0]/fac:.1f} px CSS')
