#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""08 — Q2 (recouvrement) : le bandeau en descente recouvre-t-il le chrome ?

Deux objets de chrome dans la zone traversée :
  - le MÉDAILLON central (jauge « Froid / CHALEUR ») et son anneau d'or ;
  - le LOSANGE d'or, ornement fixe au centre, juste sous le médaillon.
Le fond de référence (écran SANS bandeau) est `bandeau-entree_t0` (alpha 0,
sha256 identique à `shell-entree_t160ms` : vérifié au script 00).

A. bbox du médaillon et du losange sur le fond.
B. position du texte du bandeau (bande d'encre claire) à chaque instant.
C. chevauchement géométrique texte x losange ; et, sur les pixels, ce que devient
   le glyphe recouvert (contraste local avant/pendant).

Contrôle POSITIF : sur `t200ms` (repos), le losange doit être RECOUVERT par le
panneau du bandeau (il s'assombrit) — fait connu, visible à l'œil ; l'instrument
doit le retrouver.
Contrôle NÉGATIF : sur le fond lui-même, le « recouvrement » mesuré doit être nul.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def L(p):
    return 0.2126*lin(p[0]) + 0.7152*lin(p[1]) + 0.0722*lin(p[2])

def charger(nom):
    im = Image.open(os.path.join(BASE, nom)).convert("RGB")
    print("   ouvert %-50s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    return im

fond = charger("bandeau-entree_t0_1080x1920.png")
pf = fond.load()

print("\n### A. le chrome sous la zone traversee (mesure sur le FOND, sans bandeau)")
# or = R nettement > B
ors = [(x, y) for y in range(150, 245) for x in range(400, 700)
       if pf[x, y][0] > 60 and pf[x, y][0] - pf[x, y][2] > 40]
print("   pixels 'or' entre y=150 et y=244, x=400..699 : %d" % len(ors))
# le losange : bloc isole sous l'anneau
par_y = {}
for x, y in ors:
    par_y.setdefault(y, []).append(x)
for y in sorted(par_y):
    xs = par_y[y]
    print("     y=%3d : %2d px or, x de %d a %d" % (y, len(xs), min(xs), max(xs)))

print("\n### B. bande de TEXTE du bandeau a chaque instant (encre claire, hors losange)")
def bande_texte(im, x0=200, x1=460):
    """lignes ou l'encre claire du texte apparait, a gauche du losange"""
    p = im.load()
    out = []
    for y in range(180, 300):
        n = sum(1 for x in range(x0, x1) if p[x, y][0] >= 70)
        if n: out.append((y, n))
    if not out: return None
    return out[0][0], out[-1][0], max(n for _, n in out)

for n in ["bandeau-entree_t0_1080x1920.png", "bandeau-entree_t50ms_1080x1920.png",
          "bandeau-entree_t70ms_1080x1920.png", "bandeau-entree_t100ms_1080x1920.png",
          "bandeau-entree_t200ms_1080x1920.png"]:
    im = charger(n)
    b = bande_texte(im)
    print("     %-34s bande de texte y=%s" % (n.split('_')[1], b))

print("\n### C. le losange et le texte : qui recouvre qui, et ce que cela coute")
# fenetre du losange (bornes trouvees en A, elargies de 2 px)
LX0, LX1, LY0, LY1 = 528, 553, 213, 236
for n in ["bandeau-entree_t0_1080x1920.png", "bandeau-entree_t50ms_1080x1920.png",
          "bandeau-entree_t70ms_1080x1920.png", "bandeau-entree_t100ms_1080x1920.png",
          "bandeau-entree_t200ms_1080x1920.png"]:
    im = charger(n); p = im.load()
    lum = [L(p[x, y]) for y in range(LY0, LY1) for x in range(LX0, LX1)]
    lumf = [L(pf[x, y]) for y in range(LY0, LY1) for x in range(LX0, LX1)]
    lum.sort(); lumf.sort()
    mx = max(lum); mxf = max(lumf)
    print("     %-8s fenetre du losange : L max=%.4f (fond %.4f ; rapport %.2f)  L median=%.4f"
          % (n.split('_')[1], mx, mxf, mx/mxf, lum[len(lum)//2]))

print("\n### C2. le glyphe recouvert : les deux points du ':' (x 532..543)")
for n in ["bandeau-entree_t50ms_1080x1920.png", "bandeau-entree_t70ms_1080x1920.png",
          "bandeau-entree_t100ms_1080x1920.png", "bandeau-entree_t200ms_1080x1920.png"]:
    im = charger(n); p = im.load()
    # le ':' du bandeau est a la meme abscisse a tous les instants ; on balaye en y
    print("     %-8s colonne x=537 :" % n.split('_')[1])
    for y in range(205, 265):
        v = p[537, y]
        if v != (11, 11, 11):
            print("        y=%3d %s" % (y, v))
