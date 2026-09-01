#!/usr/bin/env python3
"""Temps 3 — geometrie HORIZONTALE : bornes en x des blocs, en px CSS rel. au bord
gauche du cadre.

Contrôle positif : les 3 tuiles de compteurs (largeur et gouttiere) — bloc dont la
  hauteur est deja sortie EGALE au script 02.
Contrôle negatif : la ligne du miroir (dont on soupconne l'etendue de differer).
"""
from PIL import Image
import os

REF = (os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376)
CAP = ('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18)


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def scan_x(spec, ycss0, ycss1, seuil, xmax_css=300):
    path, ech, cx0, cy0 = spec
    im = Image.open(path).convert('RGB')
    W, H = im.size
    y0, y1 = int(cy0 + ycss0 * ech), int(cy0 + ycss1 * ech)
    px = im.load()
    st = max(1, (y1 - y0) // 40)
    prof = [(x, med([lum(px[x, y]) for y in range(y0, y1, st)])) for x in range(0, min(W, int(cx0 + xmax_css * ech)))]
    out = []
    for i in range(1, len(prof)):
        d = prof[i][1] - prof[i - 1][1]
        if abs(d) >= seuil:
            out.append(((prof[i][0] - cx0) / ech, round(d, 1)))
    return out, im


def show(nom, ycss, seuil):
    print(f'### {nom}  fenetre y {ycss} CSS  seuil {seuil}')
    for lab, spec in (('REF', REF), ('CAP', CAP)):
        s, im = scan_x(spec, ycss[0], ycss[1], seuil)
        print(f'  {lab} {os.path.basename(spec[0])} {im.size} : ' +
              '  '.join(f'{x:.2f}({d:+.0f})' for x, d in s))
    print()


print('=== images ===')
for spec in (REF, CAP):
    print(' ', os.path.basename(spec[0]), Image.open(spec[0]).size)
print()

show('CONTROLE POSITIF — 3 tuiles de compteurs', (72, 98), 10)
show('grand panneau + carte portrait + cartes de liste', (200, 210), 6)
show('CONTROLE NEGATIF — ligne du miroir', (176.9, 177.4), 6)
show('bandeau enseigne (titre)', (12, 20), 8)
show('CTA', (400, 404), 10)
