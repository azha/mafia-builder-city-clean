#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m13 — MEDAILLON (anneau laiton, losange) et DOCK (ronds, pastille, trait actif).
Intention CSS atelier (apres mise a l echelle HUD du canon) :
  .mano  : 49 px CSS de diametre -> 176 px a x3,6 ; bordure 1,5 px CSS -> 5,4 px
  .mano::after (losange) : 5,4 px CSS -> 19,4 px, centre a 8,4 px CSS sous le medaillon
  .dock9 .rd : 35,2 px CSS -> 126,7 px de diametre ; .dock9{gap:16,8px} -> 60,5 px
  .dock9 .pt (trait de l onglet actif) : 10,7 px CSS -> 38,5 px de large
  .dock9 .disc (pastille FAMILLE) : 6,1 px CSS -> 22 px
Controle positif : l anneau laiton doit etre detecte des DEUX cotes avec la MEME epaisseur de
coupe ; sinon la sonde laiton n est pas comparable.
Controle negatif : une coupe horizontale prise 200 px SOUS le medaillon ne doit rendre aucun laiton.
"""
import os
from PIL import Image

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
JEUX = {
    'REF': (os.path.join(BASE, 'r2-2026-10-07', 'reference', 'cadre-4-la-suite.png'), 1944, 2102),
    'C19': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x1920.png'), 1762, 1920),
    'C24': (os.path.join(BASE, 'captures-2026-10-07', 'p1_lancement_1080x2400.png'), 2242, 2400),
}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def est_laiton(p):
    r, g, b = p[:3]
    return r > 110 and r > g > b and (r - b) > 45


def main():
    for k, (chemin, ydock0, ydock1) in JEUX.items():
        im = Image.open(chemin).convert('RGB')
        px = im.load()
        print('LU %s %s %s' % (k, im.size, os.path.basename(chemin)))
        # --- anneau : colonne centrale x=544, segments laiton verticaux
        col = [y for y in range(0, 260) if est_laiton(px[544, y])]
        grp = []
        if col:
            d = col[0]; p = col[0]
            for y in col[1:]:
                if y - p > 3:
                    grp.append((d, p)); d = y
                p = y
            grp.append((d, p))
        print('   MEDAILLON, coupe VERTICALE x=544 : segments laiton %s (epaisseurs %s)'
              % (grp, [b - a + 1 for a, b in grp]))
        # anneau : bbox des pixels laiton dans la fenetre 420..680 / 0..210
        pts = [(x, y) for y in range(0, 210) for x in range(420, 680) if est_laiton(px[x, y])]
        if pts:
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            print('      anneau bbox x %3d..%3d (D=%3d) · y %3d..%3d (H=%3d) · centre (%.0f, %.0f)'
                  % (min(xs), max(xs), max(xs) - min(xs) + 1, min(ys), max(ys), max(ys) - min(ys) + 1,
                     (min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0))
        # losange : laiton isole sous l anneau
        pts2 = [(x, y) for y in range(200, 260) for x in range(480, 620) if est_laiton(px[x, y])]
        if pts2:
            xs = [p[0] for p in pts2]; ys = [p[1] for p in pts2]
            print('      losange bbox x %3d..%3d (L=%2d) · y %3d..%3d (H=%2d) · centre x=%.0f'
                  % (min(xs), max(xs), max(xs) - min(xs) + 1, min(ys), max(ys), max(ys) - min(ys) + 1,
                     (min(xs) + max(xs)) / 2.0))
        else:
            print('      losange : ABSENT de la fenetre y 200..260')
        print('      [controle negatif] coupe y=400 : %d px laiton'
              % sum(1 for x in range(0, 1080) if est_laiton(px[x, 400])))
        # --- dock : ronds sur une ligne horizontale au centre des ronds
        # on cherche la ligne ou le nombre de pixels « plus clairs que le fond » est maximal
        best = None
        for y in range(ydock0, ydock1 - 40):
            L = [lum(px[x, y]) for x in range(60, 1020)]
            fond = sorted(L)[len(L) // 10]
            n = sum(1 for v in L if v - fond > 7)
            if best is None or n > best[1]:
                best = (y, n)
        y = best[0]
        L = [lum(px[x, y]) for x in range(60, 1020)]
        fond = sorted(L)[len(L) // 10]
        cols = [60 + i for i, v in enumerate(L) if v - fond > 7]
        grp = []
        if cols:
            d = cols[0]; p = cols[0]
            for x in cols[1:]:
                if x - p > 6:
                    grp.append((d, p)); d = x
                p = x
            grp.append((d, p))
        print('   DOCK, ligne la plus occupee y=%d : %d objets %s'
              % (y, len(grp), [(a, b, b - a + 1) for a, b in grp]))
        if len(grp) >= 2:
            ecarts = [grp[i + 1][0] - grp[i][1] - 1 for i in range(len(grp) - 1)]
            print('      diametres %s · ecarts entre ronds %s' % ([b - a + 1 for a, b in grp], ecarts))
        # pastille FAMILLE : disque or (#d9ab4e) dans la zone du 2e rond
        if len(grp) >= 2:
            a, b = grp[1]
            z = [(x, yy) for yy in range(ydock0, y) for x in range(a - 20, b + 20)
                 if est_laiton(px[x, yy])]
            if z:
                xs = [p[0] for p in z]; ys = [p[1] for p in z]
                print('      pastille sur le 2e rond : PRESENTE, bbox x %d..%d y %d..%d (%dx%d px)'
                      % (min(xs), max(xs), min(ys), max(ys), max(xs) - min(xs) + 1, max(ys) - min(ys) + 1))
            else:
                print('      pastille sur le 2e rond : ABSENTE')
        print()


if __name__ == '__main__':
    main()
