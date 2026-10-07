#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m12 — detail du CHROME : interlettrage du libelle du bandeau, medaillon, losange, dock.
Chaines IDENTIQUES des deux cotes : « ARGENT » et « CHALEUR ». Echelle 1:1 (1080 = 1080).
Controle positif : la couleur de l encre des deux libelles doit etre le meme jeton creme-2
(185,173,146) dans les deux images -> si oui, la sonde lit bien le meme objet.
Controle negatif : une fenetre du bandeau SANS texte doit rendre « aucune encre ».
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'),
            dict(argent=(30, 220, 34, 62), chaleur=(430, 650, 146, 180),
                 vide=(250, 400, 30, 60), mano=(350, 740, 2, 240))),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'),
            dict(argent=(30, 220, 22, 50), chaleur=(430, 650, 150, 184),
                 vide=(250, 400, 20, 50), mano=(350, 740, 2, 240))),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'),
            dict(argent=(30, 220, 22, 50), chaleur=(430, 650, 150, 184),
                 vide=(250, 400, 20, 50), mano=(350, 740, 2, 240))),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def est_laiton(p):
    r, g, b = p[:3]
    return r > 110 and r > g > b and (r - b) > 45


def glyphes(im, x0, x1, y0, y1):
    px = im.load()
    vals = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(x0, x1))
    fond = vals[len(vals) // 4]
    seuil = fond + 35
    cols = [x for x in range(x0, x1) if any(lum(px[x, y]) > seuil for y in range(y0, y1))]
    if len(cols) < 5:
        return None
    rows = [y for y in range(y0, y1) if any(lum(px[x, y]) > seuil for x in range(x0, x1))]
    grp = []; d = cols[0]; p = cols[0]
    for x in cols[1:]:
        if x - p > 1:
            grp.append((d, p)); d = x
        p = x
    grp.append((d, p))
    gaps = [grp[i + 1][0] - grp[i][1] - 1 for i in range(len(grp) - 1)]
    ch = [[], [], []]
    for x in cols:
        for y in rows:
            if lum(px[x, y]) > seuil + 20:
                q = px[x, y]
                for i in range(3):
                    ch[i].append(q[i])
    coul = tuple(sorted(c)[len(c) // 2] for c in ch) if ch[0] else None
    return dict(span=cols[-1] - cols[0] + 1, x0=cols[0], x1=cols[-1],
                cap=rows[-1] - rows[0] + 1, y0=rows[0], y1=rows[-1],
                ngrp=len(grp), gaps=gaps, encre=sum(b - a + 1 for a, b in grp), coul=coul)


def main():
    for k, (chemin, z) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        for nom in ('argent', 'chaleur', 'vide'):
            x0, x1, y0, y1 = z[nom]
            g = glyphes(im, x0, x1, y0, y1)
            if not g:
                print('   %-9s AUCUNE ENCRE' % nom.upper())
                continue
            print('   %-9s span %3d px (x %3d..%3d) · capitale %2d px (y %3d..%3d) · %d groupes · encre %3d px (%.0f%%) · gaps %s · RGB %s'
                  % (nom.upper(), g['span'], g['x0'], g['x1'], g['cap'], g['y0'], g['y1'],
                     g['ngrp'], g['encre'], 100.0 * g['encre'] / g['span'], g['gaps'], g['coul']))
        # medaillon
        x0, x1, y0, y1 = z['mano']
        pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if est_laiton(px[x, y])]
        xs = sorted(set(p[0] for p in pts)); ys = sorted(set(p[1] for p in pts))
        # separer l anneau (grosse composante haute) du losange (petite, plus bas)
        anneau = [p for p in pts if p[1] < ys[0] + 230]
        ax = [p[0] for p in anneau]; ay = [p[1] for p in anneau]
        print('   MEDAILLON laiton : x %3d..%3d (largeur %3d) · y %3d..%3d (hauteur %3d) · centre x=%.0f'
              % (min(ax), max(ax), max(ax) - min(ax) + 1, min(ay), max(ay), max(ay) - min(ay) + 1,
                 (min(ax) + max(ax)) / 2.0))
        # profil de l anneau sur la ligne du centre
        yc = (min(ay) + max(ay)) // 2
        lig = [x for x in range(x0, x1) if est_laiton(px[x, yc])]
        if lig:
            grp = []; d = lig[0]; p = lig[0]
            for x in lig[1:]:
                if x - p > 2:
                    grp.append((d, p)); d = x
                p = x
            grp.append((d, p))
            print('      coupe horizontale y=%d : segments laiton %s (epaisseurs %s)'
                  % (yc, grp, [b - a + 1 for a, b in grp]))
        print()


if __name__ == '__main__':
    main()
