#!/usr/bin/env python3
"""Temps 3 — le reflet du miroir : epaisseur, position, ETENDUE et INTENSITE.

Le reflet est une bande horizontale claire. On le mesure comme un SURPLUS de lumiere
au-dessus du fond local : pour chaque x, delta = pixel(ligne) - pixel(ligne - 8 px).
C'est la seule facon de comparer une translucidite : sur le pixel RESULTANT, au-dessus
du meme fond, jamais sur un alpha.

Contrôle positif : sur une ligne PRISE 20 px plus haut (hors reflet), le surplus doit
  etre ~0 partout. Si l'instrument y trouve du signal, il mesure autre chose.
Contrôle negatif : le surplus sur la ligne du reflet doit etre franchement > 0.
"""
from PIL import Image
import os

REF = (os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376, 905, 910)
CAP = ('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18, 633, 640)


def run(lab, spec, ctrl=False):
    path, ech, cx0, cy0, ya, yb = spec
    im = Image.open(path).convert('RGB')
    px = im.load()
    W, H = im.size
    if ctrl:
        ya, yb = ya - 25, yb - 25
    ym = (ya + yb) // 2
    print(f'  {lab}{" [CONTROLE+ hors reflet]" if ctrl else ""} '
          f'{os.path.basename(path)} {im.size}  bande y {ya}..{yb-1} '
          f'({(yb-ya)/ech:.2f} CSS d\'epaisseur), y_css={(ym-cy0)/ech:.2f}')
    prof = []
    for x in range(cx0, min(W, int(cx0 + 292 * ech))):
        base = px[x, ya - 8]
        cur = px[x, ym]
        prof.append(((x - cx0) / ech, tuple(cur[i] - base[i] for i in range(3))))
    # etendue : x ou le surplus vert depasse 6
    on = [x for x, d in prof if d[1] > 6]
    if on:
        print(f'      etendue (surplus vert > 6) : x_css {on[0]:.2f}..{on[-1]:.2f}  '
              f'largeur {on[-1]-on[0]:.2f} CSS')
    else:
        print('      etendue : AUCUN pixel au-dessus du seuil')
    print('      profil du surplus (x_css : dR,dG,dB) :')
    for xc in (20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 275):
        best = min(prof, key=lambda t: abs(t[0] - xc))
        print(f'        x={xc:4d} -> {best[1]}')


print('=== reflet du miroir ===')
run('REF', REF)
run('CAP', CAP)
print()
print('=== controles positifs (meme mesure 25 px plus haut, hors reflet) ===')
run('REF', REF, ctrl=True)
run('CAP', CAP, ctrl=True)
