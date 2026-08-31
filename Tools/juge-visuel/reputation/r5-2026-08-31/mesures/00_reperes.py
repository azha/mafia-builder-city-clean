#!/usr/bin/env python3
"""Temps 1 — repères et échelle.

Trouve le CADRE doré (bordure or de l'écran ㊲) dans la référence m-120 et dans la
capture 1080x1920, et en déduit l'offset vertical + l'échelle.

Contrôle positif : la largeur du cadre en px CSS doit sortir EGALE (~<=1 px CSS) entre
                   la référence (/3.0) et la capture (/3.6).
Contrôle négatif : la même largeur en px BRUTS doit sortir DIFFERENTE (~+20%).
                   Si les deux contrôles ne se comportent pas ainsi, l'instrument ment.
"""
from PIL import Image
import os

REF = os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png')
CAP = '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'


def is_gold(p):
    r, g, b = p[:3]
    return r > 150 and 110 < g < 210 and b < 130 and r - b > 60


def scan(path, label):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    print(f'--- {label}: {os.path.basename(path)} {W}x{H}')
    px = im.load()
    # colonnes : compte de pixels or par colonne (le cadre a 2 longs montants verticaux)
    colcount = [sum(1 for y in range(H) if is_gold(px[x, y])) for x in range(W)]
    rowcount = [sum(1 for x in range(W) if is_gold(px[x, y])) for y in range(H)]
    # montants = colonnes avec beaucoup de pixels or (>25% de la hauteur)
    cols = [x for x, c in enumerate(colcount) if c > H * 0.15]
    rows = [y for y, c in enumerate(rowcount) if c > W * 0.5]
    print('  colonnes "montant" :', cols)
    print('  lignes "traverse"  :', rows)
    return im, cols, rows


def main():
    ref, rc, rr = scan(REF, 'REFERENCE')
    cap, cc, cr = scan(CAP, 'CAPTURE 1080x1920')

    ref_x0, ref_x1 = rc[0], rc[-1]
    cap_x0, cap_x1 = cc[0], cc[-1]
    ref_y0, ref_y1 = rr[0], rr[-1]
    cap_y0, cap_y1 = cr[0], cr[-1]

    rw, cw = ref_x1 - ref_x0 + 1, cap_x1 - cap_x0 + 1
    rh, ch = ref_y1 - ref_y0 + 1, cap_y1 - cap_y0 + 1

    print()
    print(f'cadre REF  : x {ref_x0}..{ref_x1} (l={rw})  y {ref_y0}..{ref_y1} (h={rh})')
    print(f'cadre CAP  : x {cap_x0}..{cap_x1} (l={cw})  y {cap_y0}..{cap_y1} (h={ch})')
    print()
    print('== CONTROLE POSITIF (largeur du cadre en px CSS) ==')
    print(f'  ref {rw}/3.0 = {rw/3.0:.2f} CSS   cap {cw}/3.6 = {cw/3.6:.2f} CSS'
          f'   delta = {cw/3.6 - rw/3.0:+.2f} CSS')
    print('== CONTROLE NEGATIF (largeur en px BRUTS, doit differer ~+20%) ==')
    print(f'  ref {rw} px   cap {cw} px   ratio = {cw/rw:.4f}  (attendu ~1.20)')
    print()
    print('== hauteur du cadre ==')
    print(f'  ref {rh}/3.0 = {rh/3.0:.2f} CSS   cap {ch}/3.6 = {ch/3.6:.2f} CSS'
          f'   (maquette : 462 CSS)')
    print()
    print('== REPERES retenus ==')
    print(f'  REF : origine cadre ({ref_x0},{ref_y0}), 3.0 px/CSS')
    print(f'  CAP : origine cadre ({cap_x0},{cap_y0}), 3.6 px/CSS')
    print('  formule : css = (px - origine) / echelle')


main()
