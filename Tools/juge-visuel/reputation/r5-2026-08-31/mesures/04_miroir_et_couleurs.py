#!/usr/bin/env python3
"""Temps 3 — (a) le reflet du miroir : position, etendue, couleur ;
             (b) couleurs d'aplat des grandes zones (mediane d'une fenetre 9x9,
                 a >= 3 px de tout bord) ;
             (c) le fond derriere le cadre (marges laterales).

⚠️ v2 : les sondes prennent des coordonnees SEPAREES pour la ref et pour la capture,
parce que les blocs ne sont pas aux memes y (cf. 02_blocs) — sonder le meme y CSS des
deux cotes echantillonnait deux blocs differents. C'est le piege « temoin » du mandat.

Contrôle positif couleur : fond du panneau enseigne (meme token) <= 6/255 par canal.
Contrôle negatif couleur : le bord dore du cadre vs ce meme fond — doit sortir enorme.
"""
from PIL import Image
import os

REF = (os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'), 3.0, 18, 376)
CAP = ('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18)
IMS = {}


def openim(spec):
    if spec[0] not in IMS:
        IMS[spec[0]] = Image.open(spec[0]).convert('RGB')
    return IMS[spec[0]]


def px_of(spec, xcss, ycss):
    _, ech, cx0, cy0 = spec
    return int(round(cx0 + xcss * ech)), int(round(cy0 + ycss * ech))


def median_win(im, x, y, r=4):
    px = im.load()
    W, H = im.size
    assert 0 <= x < W and 0 <= y < H, f'sonde hors image ({x},{y}) vs {W}x{H}'
    ch = [[], [], []]
    for dx in range(-r, r + 1):
        for dy in range(-r, r + 1):
            xx, yy = min(W - 1, max(0, x + dx)), min(H - 1, max(0, y + dy))
            p = px[xx, yy]
            for i in range(3):
                ch[i].append(p[i])
    return tuple(sorted(c)[len(c) // 2] for c in ch)


def sample(nom, ref_xy, cap_xy):
    a_xy = px_of(REF, *ref_xy)
    b_xy = px_of(CAP, *cap_xy)
    a = median_win(openim(REF), *a_xy)
    b = median_win(openim(CAP), *b_xy)
    d = tuple(b[i] - a[i] for i in range(3))
    mx = max(abs(v) for v in d)
    print(f'  {nom:36s} REF {str(a):16s}@{str(a_xy):12s} CAP {str(b):16s}@{str(b_xy):12s} '
          f'd={str(d):16s} max={mx:3d} {"EGAL" if mx <= 6 else "ECART"}')
    return a, b


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def tealness(p):
    """positif si la teinte tire vers le cyan/vert clair sur fond bleu nuit."""
    r, g, b = p
    return g - r


def miroir(lab, spec, ycss_lo, ycss_hi, xa_css, xb_css):
    """Le reflet = une ligne HORIZONTALE claire ET plus verte que son voisinage.
    On note, pour chaque y, la somme de (lum(y)-lum(y-5)) sur la bande x."""
    im = openim(spec)
    _, ech, cx0, cy0 = spec
    px = im.load()
    W, H = im.size
    xa, xb = int(cx0 + xa_css * ech), int(cx0 + xb_css * ech)
    best = None
    for y in range(int(cy0 + ycss_lo * ech), int(cy0 + ycss_hi * ech)):
        s = sum(lum(px[x, y]) - lum(px[x, y - 5]) for x in range(xa, xb, 2))
        if best is None or s > best[1]:
            best = (y, s)
    y = best[0]
    xs = [x for x in range(cx0, min(W, int(cx0 + 292 * ech)))
          if lum(px[x, y]) - lum(px[x, y - 5]) > 6]
    x0, x1 = (xs[0], xs[-1]) if xs else (None, None)
    col = median_win(im, (xa + xb) // 2, y, r=0)
    colb = median_win(im, (xa + xb) // 2, y - 6, r=1)
    print(f'  {lab} {os.path.basename(spec[0])} {im.size}')
    print(f'      y={y}  y_css(rel cadre)={(y-cy0)/ech:.2f}  couleur ligne={col}  '
          f'fond juste au-dessus={colb}  ecart lum={lum(col)-lum(colb):+.1f}')
    print(f'      etendue x_css {(x0-cx0)/ech:.2f}..{(x1-cx0)/ech:.2f}  '
          f'largeur {(x1-x0)/ech:.2f} CSS  ({100*(x1-x0)/ech/271:.1f} % de la largeur du panneau)')
    return y


print('=== images ===')
for spec in (REF, CAP):
    print(' ', os.path.basename(spec[0]), Image.open(spec[0]).size)
print()

print('### (a) reflet du miroir (recherche : ligne claire dans le tiers haut du grand panneau)')
print('    REF : grand panneau 110.67..322.33 CSS -> tiers haut 110..185')
miroir('REF', REF, 112, 185, 20, 130)
print('    CAP : grand panneau 108.89..304.17 CSS -> tiers haut 109..174')
miroir('CAP', CAP, 111, 174, 20, 130)
print()

print("### (b) couleurs d'aplat — (x,y) CSS rel. coin haut-gauche du cadre, PROPRES a chaque image")
print('  -- controles --')
sample('CTRL+ fond panneau enseigne', (30, 14), (30, 14))
sample('CTRL- bord dore cadre (montant D)', (287.5, 200), (289.4, 200))
print('  -- aplats de blocs (temoin choisi dans CHAQUE image) --')
sample('fond tuile compteur #1', (20, 76), (20, 74))
sample('fond tuile compteur #2', (113, 76), (113, 74))
sample('fond tuile compteur #3', (206, 76), (206, 74))
sample('fond grand panneau (entre cartes)', (139.5, 130), (137.5, 128))
sample('fond carte portrait', (25, 128), (25, 125))
sample('fond carte de liste #1', (260, 160), (260, 150))
sample('fond carte de liste #2', (260, 192), (260, 180))
sample('fond panneau verdict', (260, 340), (260, 322))
sample('fond CTA', (20, 430), (20, 408))
print('  -- fond derriere le cadre (marge gauche, x=3 CSS) --')
for yr, yc in ((0, 0), (60, 60), (150, 150), (250, 250), (350, 350), (440, 440)):
    sample(f'fond marge G  y={yr}', (3, yr), (3, yc))
print()
print('### (c) fond SOUS le cadre (place du dock — hors perimetre, pour information)')
im = openim(CAP)
for ycss in (460, 480, 500, 520):
    x, y = px_of(CAP, 150, ycss)
    print(f'  CAP  y_css={ycss}  {median_win(im, x, y)}')
imr = openim(REF)
print('  REF : le cadre finit a 452 CSS et l\'image a 458.3 CSS rel-cadre — il n\'y a')
print('        que 6 CSS sous le cadre dans la maquette.')
x, y = px_of(REF, 150, 456)
print(f'  REF  y_css=456  {median_win(imr, x, y, r=1)}')
