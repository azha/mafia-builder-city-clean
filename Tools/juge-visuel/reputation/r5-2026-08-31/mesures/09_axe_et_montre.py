#!/usr/bin/env python3
"""Temps 3 — axe de la figure (methode robuste) + la montre.

AXE : pour chaque ligne, on prend le fond LOCAL (mediane des 6 px les plus a gauche de la
carte, a l'interieur), puis la silhouette = tout ce qui s'en ecarte de plus de 12/255.
Le fond de la carte est un degrade dans la capture — un fond FIXE faisait clignoter la
detection (constate, puis corrige : c'est pourquoi le fond est relu ligne par ligne).

Contrôle positif : dans la REFERENCE (figure de face, symetrique) l'axe doit retomber sur
  l'axe de la carte a <= 1 CSS.
Contrôle negatif : la MONTRE, objet volontairement place a gauche, doit sortir a plus de
  20 CSS de l'axe dans les DEUX images.
"""
from PIL import Image
import os

REF = dict(lab='REF', path=os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
           ech=3.0, cx0=18, cy0=376, kx=(17.5, 134.5), ky=(118.67, 301.33))
CAP = dict(lab='CAP', path='/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
           ech=3.6, cx0=18, cy0=18, kx=(15.4, 132.5), ky=(115.83, 290.00))


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def go(S):
    im = Image.open(S['path']).convert('RGB')
    px = im.load()
    ech, cx0, cy0 = S['ech'], S['cx0'], S['cy0']
    kx0, kx1 = S['kx']
    axe = (kx0 + kx1) / 2
    Wc = kx1 - kx0
    Hc = S['ky'][1] - S['ky'][0]
    X0 = int(cx0 + (kx0 + 2.5) * ech)
    X1 = int(cx0 + (kx1 - 2.5) * ech)
    print(f'=== {S["lab"]} {os.path.basename(S["path"])} {im.size}')
    print(f'    carte {Wc:.2f} CSS de large, axe de la carte x={axe:.2f} CSS')

    def cx(x):
        return (x - cx0) / ech

    def cy(y):
        return (y - cy0) / ech

    lignes = []
    for y in range(int(cy0 + (S['ky'][0] + 30) * ech), int(cy0 + (S['ky'][1] - 12) * ech)):
        fond = tuple(med([px[X0 + i, y][k] for i in range(6)]) for k in range(3))
        r = [x for x in range(X0, X1)
             if max(abs(px[x, y][k] - fond[k]) for k in range(3)) > 12]
        if len(r) > 15:
            lignes.append((cy(y), cx(min(r)), cx(max(r)), (cx(min(r)) + cx(max(r))) / 2,
                           cx(max(r)) - cx(min(r))))
    moy = sum(t[3] for t in lignes) / len(lignes)
    lmax = max(t[4] for t in lignes)
    ylmax = [t[0] for t in lignes if t[4] == lmax][0]
    print(f'    AXE de la silhouette (moyenne sur {len(lignes)} lignes, '
          f'y {lignes[0][0]:.1f}..{lignes[-1][0]:.1f}) = {moy:.2f} CSS')
    print(f'    -> ecart a l\'axe de la carte : {moy-axe:+.2f} CSS '
          f'({100*(moy-axe)/Wc:+.2f} % de la largeur de la carte)')
    print(f'    largeur MAX de la silhouette = {lmax:.2f} CSS = {100*lmax/Wc:.1f} % de la carte '
          f'(a y={ylmax:.2f})')
    print('    silhouette, une ligne sur 12 :')
    for t in lignes[::12]:
        print(f'      y={t[0]:7.2f}  x {t[1]:6.2f}..{t[2]:6.2f}  l={t[4]:6.2f} '
              f'centre {t[3]:6.2f} ({t[3]-axe:+5.2f})')

    # --- MONTRE : ROI = quart bas-gauche, couleur = la plus claire de ce quart hors fond
    my0 = int(cy0 + (S['ky'][1] - 45) * ech)
    my1 = int(cy0 + (S['ky'][1] - 12) * ech)
    mx0, mx1 = X0, int(cx0 + (axe - 10) * ech)
    hist = {}
    for y in range(my0, my1):
        for x in range(mx0, mx1):
            hist[px[x, y]] = hist.get(px[x, y], 0) + 1
    top = sorted(hist.items(), key=lambda t: -t[1])[:5]
    print(f'    ROI montre x {cx(mx0):.1f}..{cx(mx1):.1f} y {cy(my0):.1f}..{cy(my1):.1f} '
          f'— 5 couleurs dominantes : {[(c, n) for c, n in top]}')
    # la montre = la 2e ou 3e couleur, plus claire que le buste
    cands = [c for c, n in top if sum(c) > 90 and n > 200]
    if cands:
        mc = cands[0]
        pts = [(x, y) for y in range(my0, my1) for x in range(mx0, mx1)
               if max(abs(px[x, y][k] - mc[k]) for k in range(3)) <= 6]
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        w = (max(xs) - min(xs) + 1) / ech
        h = (max(ys) - min(ys) + 1) / ech
        print(f'    MONTRE couleur {mc} : x {cx(min(xs)):.2f}..{cx(max(xs)):.2f} '
              f'y {cy(min(ys)):.2f}..{cy(max(ys)):.2f}  l={w:.2f} h={h:.2f} CSS '
              f'| l={100*w/Wc:.1f}% h={100*h/Hc:.1f}% carte '
              f'| aire/boite={len(pts)/((max(xs)-min(xs)+1)*(max(ys)-min(ys)+1)):.3f} '
              f'| centre {(cx(min(xs))+cx(max(xs)))/2 - axe:+.2f} CSS de l\'axe')
    print()


for S in (REF, CAP):
    go(S)
