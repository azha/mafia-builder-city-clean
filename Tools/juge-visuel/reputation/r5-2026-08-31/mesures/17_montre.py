#!/usr/bin/env python3
"""Temps 3 — LA MONTRE (trait n5 de l'angle mort A7).

La maquette dessine un CADRAN : deux aiguilles PLUS SOMBRES que le corps du boitier.
On les compte comme les pixels du boitier qui sont nettement plus SOMBRES que lui.
(La v1 cherchait des pixels plus CLAIRS et n'a rien trouve — dans les deux images. Un
instrument qui ne trouve rien nulle part ne prouve rien : c'est ce qui a impose ce
second passage.)

Contrôle positif : le corps du boitier doit sortir a la meme couleur des deux cotes.
Contrôle negatif : la meme sonde passee sur un disque UNI connu — le boitier de la
  capture — doit rendre ~0 %, et sur la reference un pourcentage franchement non nul.
"""
from PIL import Image
import os

CFG = [('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
        3.0, 18, 376, (35, 42, 45), (135, 1140, 185, 1180)),
       ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
        3.6, 18, 18, (34, 42, 46), (135, 908, 200, 956))]

for lab, p, ech, cx0, cy0, corps, roi in CFG:
    im = Image.open(p).convert('RGB')
    px = im.load()
    print(f'--- {lab} {os.path.basename(p)} {im.size}   corps du boitier {corps}')
    X0, Y0, X1, Y1 = roi
    body = [(x, y) for y in range(Y0, Y1) for x in range(X0, X1)
            if max(abs(px[x, y][k] - corps[k]) for k in range(3)) <= 5]
    if not body:
        print('    boitier introuvable')
        continue
    xs = [q[0] for q in body]
    ys = [q[1] for q in body]
    bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
    print(f'    BOITIER : {len(body)} px, bbox px x {bx0}..{bx1} y {by0}..{by1} '
          f'= {(bx1-bx0+1)/ech:.2f} x {(by1-by0+1)/ech:.2f} CSS')
    # pixels INTERIEURS a la bbox du boitier, plus sombres que lui d'au moins 25 (somme RGB)
    dedans = [(x, y) for y in range(by0 + 2, by1 - 1) for x in range(bx0 + 2, bx1 - 1)]
    sombres = [(x, y) for x, y in dedans if sum(px[x, y]) < sum(corps) - 25]
    # ne garder que ceux ENTOURES de boitier (a gauche ET a droite sur la meme ligne)
    bodyset = set(body)
    inter = [(x, y) for x, y in sombres
             if any((xx, y) in bodyset for xx in range(bx0, x))
             and any((xx, y) in bodyset for xx in range(x + 1, bx1 + 1))]
    print(f'    pixels plus SOMBRES que le boitier et ENTOURES par lui : {len(inter)} '
          f'({100*len(inter)/max(1,len(body)):.1f} % de l\'aire du boitier)')
    if inter:
        ix = [q[0] for q in inter]
        iy = [q[1] for q in inter]
        cols = {}
        for q in inter:
            cols[px[q]] = cols.get(px[q], 0) + 1
        print(f'      bbox du detail : x {min(ix)}..{max(ix)} y {min(iy)}..{max(iy)} '
              f'= {(max(ix)-min(ix)+1)/ech:.2f} x {(max(iy)-min(iy)+1)/ech:.2f} CSS')
        print(f'      tons : {sorted(cols.items(), key=lambda t: -t[1])[:3]}')
    else:
        print('      -> boitier UNI : aucune aiguille, aucun cadran')
    print()
