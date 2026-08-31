#!/usr/bin/env python3
"""Temps 3 — bbox des blocs, en px CSS rapportes a l'origine du cadre.

Chaque bloc est trouve par sa BORDURE : on balaie une bande (x ou y) et on retient les
lignes ou la luminance saute. On imprime ref/jeu cote a cote et le delta en CSS.

Repere (script 00) : REF origine cadre (18,376) ech 3.0 ; CAP origine cadre (18,18) ech 3.6.

Contrôle positif : la hauteur des trois tuiles de compteurs (bloc dont on sait, a l'oeil et
  par le profil global, qu'il est juste) doit sortir <= 1 CSS de delta.
Contrôle negatif : la hauteur du grand panneau (portrait+liste) doit sortir NETTEMENT
  differente. Un instrument qui rend les deux egaux ne discrimine pas.
"""
from PIL import Image
import os

REF = (os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 881, 376)
CAP = ('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 1061, 18)


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def hprof(im, fx0, fx1, y0, y1):
    """profil vertical : mediane de luminance par ligne sur la bande x."""
    px = im.load()
    st = max(1, (fx1 - fx0) // 50)
    return [(y, med([lum(px[x, y]) for x in range(fx0, fx1, st)])) for y in range(y0, y1)]


def vprof(im, fy0, fy1, x0, x1):
    px = im.load()
    st = max(1, (fy1 - fy0) // 50)
    return [(x, med([lum(px[x, y]) for y in range(fy0, fy1, st)])) for x in range(x0, x1)]


def sauts(prof, seuil):
    out = []
    for i in range(1, len(prof)):
        d = prof[i][1] - prof[i - 1][1]
        if abs(d) >= seuil:
            out.append((prof[i][0], round(d, 1)))
    return out


def css(v, org, ech):
    return (v - org) / ech


def bloc(nom, spec, fx_frac, y_range_css, seuil=8.0, axe='h'):
    """spec = (path, ech, cx0, cx1, cy0)."""
    path, ech, cx0, cx1, cy0 = spec
    im = Image.open(path).convert('RGB')
    W, H = im.size
    span = cx1 - cx0
    fx0 = cx0 + int(span * fx_frac[0])
    fx1 = cx0 + int(span * fx_frac[1])
    y0 = int(cy0 + y_range_css[0] * ech)
    y1 = min(H, int(cy0 + y_range_css[1] * ech))
    p = hprof(im, fx0, fx1, y0, y1)
    s = sauts(p, seuil)
    return [(css(y, cy0, ech), d) for y, d in s], im, (cx0, cx1, cy0, ech)


def show(nom, fx_frac, ycss, seuil=8.0):
    print(f'### {nom}   bande x {fx_frac}  fenetre y {ycss} CSS  seuil {seuil}')
    for lab, spec in (('REF', REF), ('CAP', CAP)):
        s, im, _ = bloc(nom, spec, fx_frac, ycss, seuil)
        print(f'  {lab} {os.path.basename(spec[0])} {im.size} : ' +
              '  '.join(f'{y:.2f}({d:+.0f})' for y, d in s))
    print()


print('=== images ouvertes ===')
for spec in (REF, CAP):
    print(' ', os.path.basename(spec[0]), Image.open(spec[0]).size)
print()

# 1) tuiles de compteurs — CONTROLE POSITIF
show('tuiles compteurs (bande sur la tuile du milieu)', (0.40, 0.60), (60, 120), 10)
# 2) grand panneau portrait+liste — CONTROLE NEGATIF
show('grand panneau (bande centre)', (0.45, 0.55), (112, 330), 10)
# 3) carte portrait (bande sur la carte de gauche)
show('carte portrait (bande gauche)', (0.10, 0.35), (112, 330), 12)
# 4) cartes de la liste (bande sur la colonne de droite)
show('liste des 4 traits (bande droite)', (0.62, 0.95), (112, 330), 6)
# 5) panneau verdict + CTA + bas du cadre
show('verdict / CTA / bas du cadre', (0.45, 0.55), (300, 455), 12)
