#!/usr/bin/env python3
"""M8 - INTERLETTRAGE des petites capitales : on segmente la ligne en MOTS
(gaps d'encre > 8 px) et on compare la largeur du PREMIER MOT, identique de part
et d'autre, plus la hauteur de capitale. Largeur/hauteur = chasse normalisee,
invariante a la taille de corps.
Les deux images sont a x3,6 : X directement comparable.
Controle positif : E03 « A QUOI CA SERT » doit rendre le MEME rapport des deux
cotes (mesure M7 : 229 vs 233 px).
"""
from PIL import Image


def mots(path, x0, x1, y0, y1, clair_sur_sombre, nom):
    im = Image.open(path).convert('RGB')
    print(f'IMAGE {path.split("/")[-1]}  taille={im.size[0]}x{im.size[1]}')
    px = im.load()
    fond = sorted(sum(px[x, y]) / 3 for y in range(y0, y1) for x in range(x0, x1))
    f = fond[len(fond) // 2]
    cols = []
    for x in range(x0, x1):
        v = [sum(px[x, y]) / 3 for y in range(y0, y1)]
        on = any((t > f + 28) if clair_sur_sombre else (t < f - 28) for t in v)
        cols.append(on)
    runs, cur = [], None
    for i, on in enumerate(cols):
        if on and cur is None:
            cur = i
        elif not on and cur is not None:
            runs.append((cur + x0, i - 1 + x0)); cur = None
    if cur is not None:
        runs.append((cur + x0, x1 - 1))
    grp, g = [], [runs[0]]
    for r in runs[1:]:
        if r[0] - g[-1][1] > 9:
            grp.append(g); g = [r]
        else:
            g.append(r)
    grp.append(g)
    rows = [y for y in range(y0, y1)
            if any((sum(px[x, y]) / 3 > f + 28) if clair_sur_sombre
                   else (sum(px[x, y]) / 3 < f - 28) for x in range(x0, x1))]
    hcap = max(rows) - min(rows) + 1 if rows else 0
    w1 = grp[0][-1][1] - grp[0][0][0] + 1
    print(f'  {nom:34s} fond={f:.0f} mots={len(grp)} '
          f'1er mot x {grp[0][0][0]}..{grp[0][-1][1]} largeur={w1} px  '
          f'hcap={hcap} px  chasse normalisee={w1/hcap:.3f}')
    return w1, hcap


RC = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/'
CAP = RC + 'planches-par-ecran-2026-10-08-client2-mots/'
print('--- E05 : « QUI ... » de la section des avocats ---')
mots(CAP + 'E05_Loi_1080x2400.png', 50, 520, 884, 910, True, 'jeu  "QUI PEUT VOUS DEFENDRE"')
mots(RC + 'ecran_loi/reference-avocat-1080x2102.png', 48, 480, 640, 666, True,
     'ref68 "QUI PEUT LE DEFENDRE"')
print('--- controle positif : E03 « A QUOI ... » (meme chaine) ---')
mots(CAP + 'E03_Chanedappro_1080x2400.png', 95, 420, 927, 948, False, 'jeu  "A QUOI CA SERT"')
mots(RC + 'ecran_appro/reference-1080x2102.png', 78, 420, 770, 792, False, 'ref  "A QUOI CA SERT"')
