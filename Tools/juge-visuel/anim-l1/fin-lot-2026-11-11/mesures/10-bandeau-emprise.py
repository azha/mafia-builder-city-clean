#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""10 — emprise HORIZONTALE du bandeau, encre de la barre haute dans la bande balayee,
et crops x4 du haut d'ecran pour lecture a l'oeil.

Controle positif : l'emprise du bandeau mesuree a t100 et a t200 doit etre la MEME en x
(la translation est verticale) — ecart attendu 0 px.
Controle negatif : la meme mesure sur une bande sans bandeau (y 1500..1540) doit rendre une
emprise differente (sinon je mesure le cadre de l'image, pas le bandeau).
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
OUT = os.path.join(ICI, "crops")
os.makedirs(OUT, exist_ok=True)


def lire(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n} {im.size}")
    return im


t0 = lire("bandeau-entree_t0_1080x2400.png")
t100 = lire("bandeau-entree_t100ms_1080x2400.png")
t200 = lire("bandeau-entree_t200ms_1080x2400.png")
p0, p1, p2 = t0.load(), t100.load(), t200.load()


def emprise(pa, y0, y1, seuil=10):
    xs = [x for x in range(1080)
          if max(max(abs(pa[x, y][k] - p0[x, y][k]) for k in range(3))
                 for y in range(y0, y1)) > seuil]
    return (min(xs), max(xs), len(xs)) if xs else None


print("\n== emprise horizontale du bandeau (diff contre le fond t0) ==")
e100 = emprise(p1, 206, 282)
e200 = emprise(p2, 215, 290)
print(f"   t100ms : x={e100[0]}..{e100[1]}  ({e100[1]-e100[0]+1} px = "
      f"{100.0*(e100[1]-e100[0]+1)/1080:.1f} % de la largeur)")
print(f"   t200ms : x={e200[0]}..{e200[1]}  ({e200[1]-e200[0]+1} px = "
      f"{100.0*(e200[1]-e200[0]+1)/1080:.1f} % de la largeur)")
print(f"   controle positif (meme emprise en x) : ecart gauche={e200[0]-e100[0]:+d} px, "
      f"droite={e200[1]-e100[1]:+d} px")

print("\n== controle negatif : bande y 1500..1540 (hors bandeau) ==")
en = emprise(p2, 1500, 1540)
print(f"   {en}  -> {'DIFFERENTE' if en is None or en[:2] != e200[:2] else 'IDENTIQUE (suspect)'}")

print("\n== encre de la barre haute dans la bande balayee y 187..203, par colonne ==")
cols = {}
for y in range(187, 204):
    for x in range(1080):
        if max(p0[x, y]) > 28:
            cols.setdefault(x // 60, 0)
            cols[x // 60] += 1
print("   (colonnes de 60 px ; x = indice x 60)")
for k in sorted(cols):
    print(f"      x {k*60:4d}..{k*60+59:4d} : {cols[k]:4d} px d'encre")
recouvre = sum(v for k, v in cols.items() if e200[0] <= k * 60 + 59 and k * 60 <= e200[1])
print(f"   encre de barre haute SOUS l'emprise du bandeau : {recouvre} px")

for n, im in [("t0", t0), ("t100ms", t100), ("t200ms", t200)]:
    c = im.crop((0, 140, 1080, 320))
    c = c.resize((c.size[0] * 2, c.size[1] * 2), Image.NEAREST)
    c.save(os.path.join(OUT, f"haut-{n}.png"))
    print(f"   crop haut-{n}.png {c.size}")
