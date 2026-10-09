#!/usr/bin/env python3
"""M2b - diametre du manometre par DEUX ARCS.
Un anneau coupe par une horizontale donne DEUX runs courts ; un filet pleine
largeur en donne UN long. On ne retient que les lignes a >=2 runs, chaque run
< 40 px. Le diametre est l'ecart entre le debut du 1er run et la fin du dernier.
Comparaison directe capture <-> cadre 5 (la SEULE reference qui porte le shell).
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
FILES = [('cap ' + k, CAP + f) for k, f in [
    ('A01', 'A01_AccueilFile2Cartes_1080x2400.png'),
    ('E01', 'E01_Journal_1080x2400.png'),
    ('E08', 'E08_Lasemaine_1080x2400.png'),
    ('E11', 'E11_DecisionDetail_1080x2400.png'),
]] + [('ref ' + k, RC + f) for k, f in [
    ('A01-cadre5 (SHELL)', 'ensemble-decor/r1-2026-10-08/reference/cadre-5-tete-sur-ligne-haute.png'),
    ('E01 (ecran seul)', 'screen_c1/reference-1080x2102.png'),
]]


def runs(px, y, x0, x1):
    out, cur = [], None
    for x in range(x0, x1):
        r, g, b = px[x, y]
        isg = r > 115 and r - b > 45 and g > 80
        if isg and cur is None:
            cur = x
        elif not isg and cur is not None:
            out.append((cur, x - 1)); cur = None
    if cur is not None:
        out.append((cur, x1 - 1))
    return out


for key, path in FILES:
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f'IMAGE {path.split("/")[-1]}  taille={w}x{h}')
    px = im.load()
    best = None
    for y in range(0, 300):
        rr = [r for r in runs(px, y, 330, 751) if r[1] - r[0] + 1 >= 2]
        if len(rr) < 2:
            continue
        if max(r[1] - r[0] + 1 for r in rr) > 40:
            continue
        d = rr[-1][1] - rr[0][0] + 1
        if best is None or d > best[0]:
            best = (d, y, rr[0][0], rr[-1][1], len(rr))
    print(f'  {key:22s} diam={best[0]} px a y={best[1]} '
          f'[x {best[2]}..{best[3]}]  ({best[4]} arcs)  => {best[0]/3.6:.1f} px CSS')
