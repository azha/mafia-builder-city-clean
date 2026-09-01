#!/usr/bin/env python3
"""Temps 3 — trois traits du portrait que rien d'autre ne mesure :
  (a) la MONTRE : bbox + richesse interne (nb de couleurs distinctes) ;
  (b) les CHEVEUX : encadrent-ils le visage (ref) ou passent-ils DERRIERE (jeu) ? ;
  (c) le TRAIT horizontal clair sous la pointe du col — present dans le jeu, absent
      de la maquette (EN TROP).

Contrôle positif : (a) la couleur dominante du buste doit sortir identique ref/jeu ;
Contrôle negatif : (c) la meme sonde passee sur la REFERENCE ne doit RIEN trouver — c'est
  ce qui prouve que le trait n'est pas un artefact de la sonde.
"""
from PIL import Image
import os

REF = ('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
       3.0, 18, 376, (17.5, 134.5), (118.67, 301.33), (22, 25, 27), (185, 173, 146))
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18, (15.4, 132.5), (115.83, 290.00), (22, 22, 28), (185, 173, 146))


def go(S):
    lab, p, ech, cx0, cy0, kx, ky, cbuste, cvis = S
    im = Image.open(p).convert('RGB')
    px = im.load()
    Wc, Hc = kx[1] - kx[0], ky[1] - ky[0]
    axe = (kx[0] + kx[1]) / 2
    print(f'=== {lab} {os.path.basename(p)} {im.size}  carte {Wc:.2f}x{Hc:.2f} CSS axe {axe:.2f}')

    def X(c):
        return int(cx0 + c * ech)

    def Y(c):
        return int(cy0 + c * ech)

    def xc(x):
        return (x - cx0) / ech

    def yc(y):
        return (y - cy0) / ech

    # (a) MONTRE : dans le quart bas-gauche du buste, tout ce qui est plus CLAIR que le buste
    lb = sum(cbuste)
    pts = [(x, y) for y in range(Y(ky[1] - 55), Y(ky[1] - 12))
           for x in range(X(kx[0] + 3), X(axe - 12))
           if lb + 15 < sum(px[x, y]) < 400]
    if pts:
        xs = [q[0] for q in pts]
        ys = [q[1] for q in pts]
        w, h = (max(xs) - min(xs) + 1) / ech, (max(ys) - min(ys) + 1) / ech
        cols = {}
        for x, y in pts:
            cols[px[x, y]] = cols.get(px[x, y], 0) + 1
        gros = [c for c, n in cols.items() if n > len(pts) * 0.05]
        print(f'  MONTRE  x {xc(min(xs)):6.2f}..{xc(max(xs)):6.2f}  y {yc(min(ys)):6.2f}..{yc(max(ys)):6.2f}'
              f'  l={w:5.2f} h={h:5.2f} CSS | l={100*w/Wc:4.1f}% h={100*h/Hc:4.1f}% carte'
              f' | centre {(xc(min(xs))+xc(max(xs)))/2-axe:+.2f} CSS de l\'axe')
        print(f'          {len(cols)} couleurs distinctes, dont {len(gros)} occupant >5 % : '
              f'{sorted(gros, key=lambda c: -cols[c])[:4]}')
    else:
        print('  MONTRE : rien trouve')

    # (b) CHEVEUX vs VISAGE
    vrows = {}
    for y in range(Y(ky[0] + 30), Y(ky[0] + 110)):
        r = [x for x in range(X(kx[0] + 3), X(kx[1] - 3))
             if max(abs(px[x, y][k] - cvis[k]) for k in range(3)) <= 12]
        if len(r) >= 3:
            vrows[y] = (min(r), max(r))
    vy0 = min(vrows)
    vy1 = max(vrows)
    ylarge = max(vrows, key=lambda y: vrows[y][1] - vrows[y][0])
    print(f'  VISAGE  sommet y={yc(vy0):.2f}  ligne la plus large y={yc(ylarge):.2f} '
          f'({xc(vrows[ylarge][0]):.2f}..{xc(vrows[ylarge][1]):.2f})')
    # cheveux : classe buste au-dessus du visage
    hrows = {}
    for y in range(Y(ky[0] + 25), ylarge + 1):
        r = [x for x in range(X(kx[0] + 3), X(kx[1] - 3))
             if max(abs(px[x, y][k] - cbuste[k]) for k in range(3)) <= 6]
        if len(r) >= 5:
            hrows[y] = (min(r), max(r), len(r))
    if hrows:
        hy0 = min(hrows)
        hlarge = max(hrows, key=lambda y: hrows[y][1] - hrows[y][0])
        hw = (hrows[hlarge][1] - hrows[hlarge][0] + 1) / ech
        vw = (vrows[ylarge][1] - vrows[ylarge][0] + 1) / ech
        print(f'  CHEVEUX sommet y={yc(hy0):.2f}  largeur max {hw:.2f} CSS '
              f'(a y={yc(hlarge):.2f})')
        print(f'  -> largeur CHEVEUX / largeur VISAGE = {hw/vw:.3f}   '
              f'({"les cheveux DEBORDENT le visage (encadrement)" if hw > vw + 1 else "le visage est PLUS LARGE que les cheveux (cheveux derriere)"})')
        # combien de lignes du visage ont des cheveux DE PART ET D'AUTRE ?
        n = 0
        for y in sorted(vrows):
            if y in hrows:
                a, b = vrows[y]
                rr = [x for x in range(X(kx[0] + 3), X(kx[1] - 3))
                      if max(abs(px[x, y][k] - cbuste[k]) for k in range(3)) <= 6]
                if any(x < a for x in rr) and any(x > b for x in rr):
                    n += 1
        print(f'  -> lignes du visage flanquees de cheveux DES DEUX COTES : {n} / {len(vrows)} '
              f'({100*n/len(vrows):.0f} %)')

    # (c) trait horizontal clair sous la pointe du col
    found = []
    for y in range(Y(ky[0] + 115), Y(ky[1] - 35)):
        r = [x for x in range(X(kx[0] + 3), X(kx[1] - 3))
             if 300 < sum(px[x, y]) < 620
             and max(abs(px[x, y][k] - cbuste[k]) for k in range(3)) > 40]
        if len(r) > 25 * ech / 3 and (max(r) - min(r)) / ech > 12:
            # est-ce une LIGNE (1 a 2 px de haut) ? verifier au-dessus/dessous
            above = sum(1 for x in r if 300 < sum(px[x, y - 3]) < 620)
            below = sum(1 for x in r if 300 < sum(px[x, y + 3]) < 620)
            if above < len(r) * 0.3 and below < len(r) * 0.3:
                found.append((yc(y), xc(min(r)), xc(max(r)), len(r), px[r[len(r) // 2], y]))
    if found:
        for f in found:
            print(f'  TRAIT HORIZONTAL isole : y={f[0]:.2f}  x {f[1]:.2f}..{f[2]:.2f} '
                  f'(largeur {f[2]-f[1]:.2f} CSS)  {f[3]} px  couleur {f[4]}')
    else:
        print('  TRAIT HORIZONTAL isole : AUCUN  <= controle negatif si c\'est la REFERENCE')
    print()


for S in (REF, CAP):
    go(S)
