#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""11 — Q2 (recouvrement, suite) : jusqu'ou MONTE le bandeau, et sur QUOI.

Le fond de reference est `bandeau-entree_t0` : meme ecran, bandeau a alpha 0
(verifie au script 10 : encre nulle). Tout pixel qui differe du fond EST le
bandeau. On en prend la bbox, puis, ligne par ligne au-dessus du repos, ce que
le bandeau touche du chrome.

Reperes du script 08 (lus sur le fond) :
  - anneau d'or du medaillon : pixels d'or jusqu'a y=203 inclus ;
  - losange d'or : y 215..231, x 531..548 ;
  - repos du filet haut du bandeau : y 215..217.

Controle POSITIF : a t200 (repos) la bbox doit commencer a y=215 (le filet au repos,
mesure independamment au script 07).
Controle NEGATIF : fond contre lui-meme -> aucune bbox.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def ouvrir(rel):
    im = Image.open(os.path.join(BASE, rel)).convert("RGB")
    print("   ouvert %-50s taille=%dx%d" % (rel, im.size[0], im.size[1]))
    return im

def bbox(im, imf, seuil=2):
    p, q = im.load(), imf.load()
    w, h = im.size
    x0, y0, x1, y1 = w, h, -1, -1
    lignes = {}
    for y in range(140, 360):
        xs = []
        for x in range(w):
            d = max(abs(p[x,y][0]-q[x,y][0]), abs(p[x,y][1]-q[x,y][1]), abs(p[x,y][2]-q[x,y][2]))
            if d > seuil: xs.append(x)
        if xs:
            lignes[y] = (min(xs), max(xs), len(xs))
            x0 = min(x0, min(xs)); x1 = max(x1, max(xs))
            y0 = min(y0, y); y1 = max(y1, y)
    return (x0, y0, x1, y1) if y1 >= 0 else None, lignes

for res in ("1080x1920", "1080x2400"):
    fond = ouvrir("bandeau-entree_t0_%s.png" % res)
    print("   CONTROLE NEGATIF fond vs fond : bbox = %s" % (bbox(fond, fond)[0],))
    for inst in ("t50ms", "t70ms", "t100ms", "t200ms"):
        im = ouvrir("bandeau-entree_%s_%s.png" % (inst, res))
        bb, lignes = bbox(im, fond)
        print("   %-7s bbox du bandeau = %s" % (inst, bb))
        for y in sorted(lignes)[:14]:
            a, b, n = lignes[y]
            note = ""
            if y <= 203: note = " <- CHEVAUCHE l'anneau d'or du medaillon (or jusqu'a y=203)"
            if 215 <= y <= 231 and a <= 548 and b >= 531: note += " (fenetre du losange)"
            print("        y=%3d : %4d px modifies, x de %3d a %3d%s" % (y, n, a, b, note))
        print("")
