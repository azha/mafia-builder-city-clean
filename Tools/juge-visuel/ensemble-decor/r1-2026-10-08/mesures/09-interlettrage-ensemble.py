#!/usr/bin/env python3
"""M9 - interlettrage des petites capitales, sur des chaines IDENTIQUES
reference <-> jeu (donc un seul facteur change). On rend : hauteur de capitale,
largeur d'encre totale, gap median entre glyphes. Les deux cotes sont a x3,6.
Controle positif : la largeur totale de la MEME chaine doit etre proche si la
graisse et le corps sont les memes ; sinon l'ecart est bien typographique.
"""
from PIL import Image

RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'


def mesure(path, x0, x1, y0, y1, clair, nom):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    s = sorted(sum(px[x, y]) / 3 for y in range(y0, y1) for x in range(x0, x1))
    f = s[len(s) // 2]
    def on(x, y):
        t = sum(px[x, y]) / 3
        return t > f + 28 if clair else t < f - 28
    cols = [any(on(x, y) for y in range(y0, y1)) for x in range(x0, x1)]
    rs, cur = [], None
    for i, o in enumerate(cols):
        if o and cur is None:
            cur = i
        elif not o and cur is not None:
            rs.append((cur + x0, i - 1 + x0)); cur = None
    if cur is not None:
        rs.append((cur + x0, x1 - 1))
    gaps = sorted(rs[i + 1][0] - rs[i][1] - 1 for i in range(len(rs) - 1))
    inter = [g for g in gaps if g <= 12]          # entre glyphes d'un mot
    rows = [y for y in range(y0, y1) if any(on(x, y) for x in range(x0, x1))]
    hc = max(rows) - min(rows) + 1
    tot = rs[-1][1] - rs[0][0] + 1
    gm = inter[len(inter) // 2] if inter else None
    print(f'  {nom:40s} hcap={hc:3d}  largeur={tot:4d}  glyphes={len(rs):2d}  '
          f'gap_median_interlettre={gm}')
    return hc, tot, gm


print('=== chaine « CE QUI SE DIT CE MATIN » (sous-titre du journal) ===')
mesure(CAP + 'E01_Journal_1080x2400.png', 300, 790, 645, 675, True, 'jeu E01')
mesure(RC + 'screen_c1/reference-1080x2102.png', 280, 760, 592, 622, True, 'ref E01')
print('=== chaine « LES EXTRAS — PAYES EN MARKS » (entete boutique) ===')
mesure(CAP + 'E07_Boutique_1080x2400.png', 30, 700, 700, 730, True, 'jeu E07')
mesure('/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/compte/reference-㉓-1080x2102.png', 35, 690, 645, 675, True, 'ref E07')
print('=== chaine « LA VITRINE » (titre boutique) ===')
mesure(CAP + 'E07_Boutique_1080x2400.png', 35, 400, 560, 600, True, 'jeu E07')
mesure('/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/compte/reference-㉓-1080x2102.png', 40, 410, 490, 530, True, 'ref E07')
