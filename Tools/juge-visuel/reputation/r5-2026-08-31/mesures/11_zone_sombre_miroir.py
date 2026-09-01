#!/usr/bin/env python3
"""Temps 3 — la ZONE SOMBRE du miroir : dans la carte du portrait, une sous-region du fond
est plus sombre que le reste (REF (11,16,22) contre (17,24,35) ; JEU (13,13,22) contre
(13,22,34)). C'est le « miroir » proprement dit. On en mesure la bbox.

⚠️ Cette zone m'avait d'abord fait croire a des cheveux encadrant le visage dans la
reference : la sonde couleur a montre que non. Note pour le lecteur : ce sont deux fonds,
pas un cheveu.

Contrôle positif : la couleur SOMBRE doit sortir identique ref/jeu a <= 6/255.
Contrôle negatif : la couleur CLAIRE du meme fond, elle aussi, doit sortir identique —
  si les deux sortaient differentes, la sonde mesurerait le contraste global, pas la zone.
"""
from PIL import Image
import os

CFG = [('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
        3.0, 18, 376, (17.5, 134.5), (118.67, 301.33), (11, 16, 22), (17, 24, 35)),
       ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
        3.6, 18, 18, (15.4, 132.5), (115.83, 290.00), (13, 13, 22), (13, 22, 34))]

res = {}
for lab, p, ech, cx0, cy0, kx, ky, sombre, clair in CFG:
    im = Image.open(p).convert('RGB')
    px = im.load()
    print(f'=== {lab} {os.path.basename(p)} {im.size}')
    Wc, Hc = kx[1] - kx[0], ky[1] - ky[0]
    X0, X1 = int(cx0 + (kx[0] + 2) * ech), int(cx0 + (kx[1] - 2) * ech)
    Y0, Y1 = int(cy0 + (ky[0] + 2) * ech), int(cy0 + (ky[1] - 2) * ech)
    rows = {}
    for y in range(Y0, Y1):
        r = [x for x in range(X0, X1) if px[x, y] == sombre]
        if len(r) > 10:
            rows[y] = (min(r), max(r), len(r))
    if rows:
        ys = sorted(rows)
        x0 = min(rows[y][0] for y in ys)
        x1 = max(rows[y][1] for y in ys)
        print(f'  zone SOMBRE {sombre} : x {(x0-cx0)/ech:.2f}..{(x1-cx0)/ech:.2f} '
              f'y {(ys[0]-cy0)/ech:.2f}..{(ys[-1]-cy0)/ech:.2f}  '
              f'l={(x1-x0)/ech:.2f} h={(ys[-1]-ys[0])/ech:.2f} CSS  '
              f'| l={100*(x1-x0)/ech/Wc:.1f}% h={100*(ys[-1]-ys[0])/ech/Hc:.1f}% de la carte')
        print(f'  bord haut de la zone = {(ys[0]-cy0)/ech:.2f} CSS '
              f'(la ligne du reflet est a 177.0 / 171.7 CSS)')
        res[lab] = (sombre, clair)
    else:
        print('  zone SOMBRE : absente')
    print()

print('CONTROLE : couleurs des deux fonds de la carte')
print(f'  sombre  REF {res["REF"][0]}  JEU {res["CAP"][0]}  '
      f'max|d|={max(abs(res["REF"][0][i]-res["CAP"][0][i]) for i in range(3))}')
print(f'  clair   REF {res["REF"][1]}  JEU {res["CAP"][1]}  '
      f'max|d|={max(abs(res["REF"][1][i]-res["CAP"][1][i]) for i in range(3))}')
