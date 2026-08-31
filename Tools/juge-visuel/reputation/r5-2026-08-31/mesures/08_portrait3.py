#!/usr/bin/env python3
"""Temps 3 — portrait, suite : axe de la figure, ordre de superposition cheveux/visage,
silhouette du buste, montre.

Contrôles :
  + axe de la figure : la moyenne des centres de ligne du BUSTE seul doit retomber sur
    l'axe de la carte dans la REFERENCE (une figure de face est symetrique) ;
  - le meme calcul sur la MONTRE (objet volontairement decentre) doit sortir loin de l'axe.
"""
from PIL import Image
import os

REF = dict(lab='REF', path=os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
           ech=3.0, cx0=18, cy0=376, kx=(17.0, 134.0), ky=(118.67, 301.33),
           fond=(17, 24, 35), buste=(22, 25, 27), visage=(185, 173, 146),
           montre=(35, 42, 45), buste_y=(240, 295))
CAP = dict(lab='CAP', path='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
           ech=3.6, cx0=18, cy0=18, kx=(15.0, 132.5), ky=(115.83, 290.00),
           fond=(13, 22, 34), buste=(22, 22, 28), visage=(185, 173, 146),
           montre=(34, 42, 46), buste_y=(232, 285))


def near(p, c, tol):
    return all(abs(p[i] - c[i]) <= tol for i in range(3))


def go(S):
    im = Image.open(S['path']).convert('RGB')
    px = im.load()
    ech, cx0, cy0 = S['ech'], S['cx0'], S['cy0']
    kx0, kx1 = S['kx']
    axe = (kx0 + kx1) / 2
    Wc = kx1 - kx0
    Hc = S['ky'][1] - S['ky'][0]
    X0, X1 = int(cx0 + (kx0 + 3) * ech), int(cx0 + (kx1 - 3) * ech)
    print(f'=== {S["lab"]} {os.path.basename(S["path"])} {im.size}  carte {Wc:.2f} CSS, axe {axe:.2f}')

    def cssx(x):
        return (x - cx0) / ech

    def cssy(y):
        return (y - cy0) / ech

    # --- 1) AXE de la figure : centre de la silhouette (tout ce qui n'est pas le fond)
    ya, yb = int(cy0 + S['buste_y'][0] * ech), int(cy0 + S['buste_y'][1] * ech)
    cs = []
    for y in range(ya, yb):
        r = [x for x in range(X0, X1) if not near(px[x, y], S['fond'], 10)]
        if len(r) > 20:
            cs.append((cssy(y), cssx(min(r)), cssx(max(r)), (cssx(min(r)) + cssx(max(r))) / 2,
                       (cssx(max(r)) - cssx(min(r)))))
    if cs:
        moy = sum(t[3] for t in cs) / len(cs)
        print(f'  AXE du buste (moyenne sur {len(cs)} lignes, y {cs[0][0]:.1f}..{cs[-1][0]:.1f}) '
              f'= {moy:.2f} CSS   ecart a l\'axe de la carte = {moy-axe:+.2f} CSS')
        lmax = max(t[4] for t in cs)
        print(f'  BUSTE largeur max = {lmax:.2f} CSS = {100*lmax/Wc:.1f} % de la carte')
        print('  silhouette du buste (y_css : x0..x1, largeur CSS) :')
        prev = None
        for t in cs:
            if prev is None or abs(t[4] - prev) > 2.5:
                print(f'      y={t[0]:7.2f}  x {t[1]:6.2f}..{t[2]:6.2f}  l={t[4]:6.2f}')
                prev = t[4]

    # --- 2) ordre de superposition cheveux / visage
    #     a la hauteur ou le visage est le plus large, les cheveux debordent-ils ?
    vrows = {}
    for y in range(int(cy0 + 150 * ech), int(cy0 + 235 * ech)):
        r = [x for x in range(X0, X1) if near(px[x, y], S['visage'], 12)]
        if len(r) >= 3:
            vrows[y] = (min(r), max(r))
    if vrows:
        ymax0 = max(vrows, key=lambda y: vrows[y][1] - vrows[y][0])
        vy00 = min(vrows)
        ymax = int(vy00 + 0.30 * (ymax0 - vy00))  # 30 % sous le sommet du visage
        vx0, vx1 = vrows[ymax]
        # a cette meme ligne, etendue de la classe "sombre" (cheveux/buste)
        r = [x for x in range(X0, X1) if near(px[x, ymax], S['buste'], 6)]
        print(f'  a la ligne la plus large du visage (y={cssy(ymax):.2f}) :')
        print(f'      visage x {cssx(vx0):6.2f}..{cssx(vx1):6.2f}')
        if r:
            print(f'      sombre x {cssx(min(r)):6.2f}..{cssx(max(r)):6.2f}  '
                  f'(pixels sombres a gauche du visage : '
                  f'{sum(1 for x in r if x < vx0)} ; a droite : {sum(1 for x in r if x > vx1)})')
            g = [x for x in r if x < vx0]
            d = [x for x in r if x > vx1]
            eg = cssx(vx0) - cssx(max(g)) if g else None
            ed = cssx(min(d)) - cssx(vx1) if d else None
            print(f'      -> ecart visage<->sombre : gauche {eg}, droite {ed} CSS')
        # sommet du visage vs sommet des cheveux
        vy0 = min(vrows)
        chrows = [y for y in range(int(cy0 + 140 * ech), ymax)
                  if sum(1 for x in range(X0, X1) if near(px[x, y], S['buste'], 6)) > 10]
        if chrows:
            print(f'      sommet des CHEVEUX y={cssy(min(chrows)):.2f} ; '
                  f'sommet du VISAGE y={cssy(vy0):.2f} ; '
                  f'les cheveux depassent le visage de {cssy(vy0)-cssy(min(chrows)):.2f} CSS')

    # --- 3) MONTRE : ROI restreint au quart bas-gauche du buste
    mx0, mx1 = X0, int(cx0 + (axe - 8) * ech)
    my0, my1 = int(cy0 + (S['buste_y'][0] + 0.45 * (S['buste_y'][1] - S['buste_y'][0])) * ech), yb
    pts = [(x, y) for y in range(my0, my1) for x in range(mx0, mx1)
           if near(px[x, y], S['montre'], 8)]
    if pts:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        w = (max(xs) - min(xs) + 1) / ech
        h = (max(ys) - min(ys) + 1) / ech
        print(f'  MONTRE (ROI bas-gauche) x {cssx(min(xs)):.2f}..{cssx(max(xs)):.2f} '
              f'y {cssy(min(ys)):.2f}..{cssy(max(ys)):.2f}  l={w:.2f} h={h:.2f} CSS  '
              f'| l={100*w/Wc:.1f}% carte  h={100*h/Hc:.1f}% carte  '
              f'| aire/boite={len(pts)/((max(xs)-min(xs)+1)*(max(ys)-min(ys)+1)):.3f}  '
              f'| centre x {(cssx(min(xs))+cssx(max(xs)))/2 - axe:+.2f} CSS de l\'axe')
        # CONTROLE NEGATIF : la montre doit etre franchement decentree
    else:
        print('  MONTRE : ABSENTE du ROI')
    print()


for S in (REF, CAP):
    go(S)
