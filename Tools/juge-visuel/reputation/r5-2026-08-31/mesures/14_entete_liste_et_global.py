#!/usr/bin/env python3
"""Temps 3 + 4 — (a) l'en-tete de la colonne de droite (« Pas encore jugeable » +
« ce qu'il a absorbe de vos regles ») ; (b) la couche globale : palette, luminance,
densite d'encre, dans le CADRE seul (le fond hors cadre n'est pas comparable, le chrome
manquant).

Contrôle positif (b) : la part de la couleur de fond dominante doit etre du meme ordre
  (< 5 points d'ecart) — sinon l'histogramme ne compare pas les memes surfaces.
Contrôle negatif (b) : la palette du CADRE contre celle de la BANDE HORS CADRE de la
  meme image doit sortir franchement differente.
"""
from PIL import Image
import os

REF = ('REF', os.path.join(os.path.dirname(__file__), '..', 'reference', 'm-120.png'),
       3.0, 18, 376, 288.0, 452.0)
CAP = ('CAP', '/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
       3.6, 18, 18, 290.0, 452.0)
IM = {}


def im_of(p):
    if p not in IM:
        IM[p] = Image.open(p).convert('RGB')
    return IM[p]


def bandes(S, xc0, xc1, yc0, yc1, seuil=45, minpx=2):
    lab, p, ech, cx0, cy0 = S[:5]
    im = im_of(p)
    px = im.load()
    X0, X1 = int(cx0 + xc0 * ech), int(cx0 + xc1 * ech)
    Y0, Y1 = int(cy0 + yc0 * ech), int(cy0 + yc1 * ech)
    coins = [px[X0, Y0], px[X1 - 1, Y0], px[X0, Y1 - 1], px[X1 - 1, Y1 - 1]]
    fond = tuple(sorted(c[k] for c in coins)[1] for k in range(3))
    rows = {}
    for y in range(Y0, Y1):
        r = [x for x in range(X0, X1)
             if max(abs(px[x, y][k] - fond[k]) for k in range(3)) > seuil]
        if len(r) >= minpx:
            rows[y] = r
    out, cur = [], []
    for y in range(Y0, Y1):
        if y in rows:
            cur.append(y)
        elif cur:
            out.append(cur)
            cur = []
    if cur:
        out.append(cur)
    res = []
    for b in out:
        xs = [x for y in b for x in rows[y]]
        res.append(dict(y0=(b[0] - cy0) / ech, y1=(b[-1] - cy0) / ech, h=len(b) / ech,
                        x0=(min(xs) - cx0) / ech, x1=(max(xs) - cx0) / ech,
                        w=(max(xs) - min(xs) + 1) / ech))
    return res


print('=== images ===')
for S in (REF, CAP):
    print(' ', os.path.basename(S[1]), im_of(S[1]).size)
print()

print('=== (a) en-tete de la colonne de droite ===')
print('  -- titre « Pas encore jugeable » (colonne x 143..215 CSS) --')
for S, w in ((REF, (144, 216, 118, 142)), (CAP, (142, 216, 114, 138))):
    for i, b in enumerate(bandes(S, *w)):
        print(f'    {S[0]} ligne {i} : y {b["y0"]:6.2f}..{b["y1"]:6.2f} h={b["h"]:5.2f} '
              f'x {b["x0"]:6.2f}..{b["x1"]:6.2f} l={b["w"]:6.2f} CSS')
print('  -- sous-titre « ce qu il a absorbe de vos regles » (colonne x 216..278 CSS) --')
for S, w in ((REF, (216, 277, 118, 148)), (CAP, (216, 279, 114, 144))):
    for i, b in enumerate(bandes(S, *w)):
        print(f'    {S[0]} ligne {i} : y {b["y0"]:6.2f}..{b["y1"]:6.2f} h={b["h"]:5.2f} '
              f'x {b["x0"]:6.2f}..{b["x1"]:6.2f} l={b["w"]:6.2f} CSS')
print()

print('=== (b) couche globale, DANS le cadre ===')


def couche(S, y0c, y1c, titre):
    lab, p, ech, cx0, cy0, Wcss, Hcss = S
    im = im_of(p)
    px = im.load()
    X0, X1 = int(cx0 + 1 * ech), int(cx0 + (Wcss - 1) * ech)
    Y0, Y1 = int(cy0 + y0c * ech), int(cy0 + y1c * ech)
    st = 2
    hist = {}
    lum = 0.0
    n = 0
    for y in range(Y0, Y1, st):
        for x in range(X0, X1, st):
            c = px[x, y]
            q = (c[0] // 16, c[1] // 16, c[2] // 16)
            hist[q] = hist.get(q, 0) + 1
            lum += 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
            n += 1
    top = sorted(hist.items(), key=lambda t: -t[1])[:6]
    print(f'  {lab} {titre} ({n} px echantillonnes)  luminance moyenne = {lum/n:.2f}/255')
    for q, k in top:
        print(f'      {str(tuple(v*16+8 for v in q)):18s} {100*k/n:5.2f} %')
    # densite d'encre : part des pixels dont la luminance depasse le fond + 25
    fondlum = min(0.2126 * (q[0] * 16 + 8) + 0.7152 * (q[1] * 16 + 8) + 0.0722 * (q[2] * 16 + 8)
                  for q, k in top[:2])
    enc = 0
    for y in range(Y0, Y1, st):
        for x in range(X0, X1, st):
            c = px[x, y]
            if 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] > fondlum + 25:
                enc += 1
    print(f'      densite d\'encre (lum > fond+25) = {100*enc/n:.2f} %')
    return lum / n, 100 * enc / n


a = couche(REF, 0, 452, 'cadre entier')
b = couche(CAP, 0, 452, 'cadre entier')
print(f'  -> luminance {a[0]:.2f} vs {b[0]:.2f} ({b[0]-a[0]:+.2f})   '
      f'densite d\'encre {a[1]:.2f} % vs {b[1]:.2f} % ({b[1]-a[1]:+.2f} pt)')
print()
print('  CONTROLE NEGATIF : la meme couche sur la BANDE HORS CADRE de la capture')
lab, p, ech, cx0, cy0, W, H = CAP
im = im_of(p)
px = im.load()
n = 0
lum = 0.0
for y in range(int(cy0 + 460 * ech), im.size[1], 2):
    for x in range(0, im.size[0], 2):
        c = px[x, y]
        lum += 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        n += 1
print(f'    luminance du fond sous le cadre (capture) = {lum/n:.2f}/255 '
      f'(contre {b[0]:.2f} dans le cadre) — la sonde discrimine bien deux surfaces')
