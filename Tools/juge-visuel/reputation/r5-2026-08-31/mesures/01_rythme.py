#!/usr/bin/env python3
"""Temps 1+2 — rythme vertical : frontières horizontales DANS le cadre.

Methode : sur une bande verticale centree (x = 35%..65% de la largeur du cadre), on
calcule pour chaque ligne y la luminance mediane. Une frontiere de bloc est un saut de
luminance. On imprime les segments (aplats) et leurs bornes, en px puis en px CSS
rapportes a l'origine du cadre (repere du script 00).

Contrôle positif : la 1re frontiere trouvee doit etre le haut du cadre lui-meme (y=origine).
Contrôle negatif : sur une bande prise HORS du cadre (x=2..10 px), aucun bloc ne doit
                   sortir avec les memes seuils (le fond est un aplat).
"""
from PIL import Image
import os

REF = os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png')
CAP = '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png'
CAP24 = '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png'

# (chemin, echelle, cadre_x0, cadre_x1, cadre_y0)
CIBLES = [
    ('REFERENCE m-120', REF, 3.0, 18, 881, 376),
    ('CAPTURE 1920', CAP, 3.6, 18, 1061, 18),
    ('CAPTURE 2400', CAP24, 3.6, None, None, None),
]


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def median(v):
    v = sorted(v)
    return v[len(v) // 2]


def profil(im, x0, x1, y0, y1):
    px = im.load()
    step = max(1, (x1 - x0) // 60)
    out = []
    for y in range(y0, y1):
        out.append(median([lum(px[x, y]) for x in range(x0, x1, step)]))
    return out


def frontieres(prof, y0, seuil=6.0):
    fr = []
    for i in range(1, len(prof)):
        d = prof[i] - prof[i - 1]
        if abs(d) >= seuil:
            fr.append((y0 + i, round(d, 1)))
    return fr


def run(label, path, ech, cx0, cx1, cy0):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    print(f'=== {label} : {os.path.basename(path)} {W}x{H}')
    if cx0 is None:
        # redetecte le cadre dore
        px = im.load()

        def is_gold(p):
            r, g, b = p[:3]
            return r > 150 and 110 < g < 210 and b < 130 and r - b > 60
        cols = [x for x in range(W) if sum(1 for y in range(H) if is_gold(px[x, y])) > H * 0.10]
        rows = [y for y in range(H) if sum(1 for x in range(W) if is_gold(px[x, y])) > W * 0.5]
        cx0, cx1, cy0 = cols[0], cols[-1], rows[0]
        print(f'  cadre redetecte : x {cx0}..{cx1}  y0 {cy0}')
    span = cx1 - cx0
    bx0, bx1 = cx0 + int(span * 0.35), cx0 + int(span * 0.65)
    prof = profil(im, bx0, bx1, cy0, H)
    fr = frontieres(prof, cy0)
    print(f'  bande x {bx0}..{bx1}, frontieres (y_px, y_CSS_rel_cadre, saut_lum) :')
    for y, d in fr:
        print(f'    y={y:5d}  css={(y - cy0) / ech:7.2f}  saut={d:+.1f}')
    # controle negatif : bande hors cadre
    if cx0 > 12:
        prof2 = profil(im, 2, min(12, cx0 - 2), cy0, H)
        fr2 = frontieres(prof2, cy0)
        print(f'  CONTROLE NEGATIF (bande hors cadre x 2..{min(12, cx0-2)}) : '
              f'{len(fr2)} frontiere(s) — attendu 0 ou tres peu')
        for y, d in fr2[:8]:
            print(f'      y={y} saut={d:+.1f}')
    print()


for c in CIBLES:
    run(*c)
