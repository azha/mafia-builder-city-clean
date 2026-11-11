#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""11 — TOUT le bandeau descend-il d'un bloc ? (la correlation globale de 07 valait 0,9768,
pas 1,0 : je verifie element par element.)

Je soustrais le fond (t0, alpha=0) et j'imprime le profil de lignes de D100 et D200, puis je
mesure le decalage separement sur TROIS tranches en x : le filet/losange central (x 480..600),
le texte (x 300..900 hors centre) et les bords de la plaque (x 120..260).

Controle positif : les trois tranches doivent rendre le MEME decalage (8,7 px) si le bandeau
descend d'un bloc ; le controle de 07 (D200 contre lui-meme = 0,00) vaut pour l'instrument.
Controle negatif : la tranche x 480..600 de D200 decalee de 6 px doit etre retrouvee a 6 px.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
Y0, Y1 = 150, 330


def lire(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n} {im.size}")
    return im.load()


p0 = lire("bandeau-entree_t0_1080x2400.png")
p1 = lire("bandeau-entree_t100ms_1080x2400.png")
p2 = lire("bandeau-entree_t200ms_1080x2400.png")


def prof(pa, xa, xb):
    return [sum(sum(abs(pa[x, y][k] - p0[x, y][k]) for k in range(3))
                for x in range(xa, xb)) / float(xb - xa)
            for y in range(Y0, Y1)]


def decalage(a, b, maxd=20):
    def corr(d):
        n = da = db = 0.0
        for i in range(len(a)):
            j = i - d
            if 0 <= j < len(a):
                n += a[j] * b[i]
                da += a[j] ** 2
                db += b[i] ** 2
        return n / ((da * db) ** 0.5) if da > 0 and db > 0 else 0.0
    sc = {d: corr(d) for d in range(-maxd, maxd + 1)}
    best = max(sc, key=sc.get)
    y1, y2, y3 = sc.get(best - 1, 0), sc[best], sc.get(best + 1, 0)
    den = y1 - 2 * y2 + y3
    return best + (0.5 * (y1 - y3) / den if den else 0.0), sc[best]


print("\n== profil de lignes |image - fond| (y, D100, D200) ==")
g100, g200 = prof(p1, 0, 1080), prof(p2, 0, 1080)
for i, y in enumerate(range(Y0, Y1)):
    if max(g100[i], g200[i]) > 0.5:
        print(f"   y={y:4d}   D100={g100[i]:7.2f}   D200={g200[i]:7.2f}")

print("\n== decalage par tranche en x ==")
TRANCHES = [("losange/filet central  x 480..600", 480, 600),
            ("texte gauche           x 300..470", 300, 470),
            ("texte droit            x 610..900", 610, 900),
            ("bord gauche plaque     x 120..260", 120, 260)]
for nom, xa, xb in TRANCHES:
    a, b = prof(p1, xa, xb), prof(p2, xa, xb)
    d, c = decalage(a, b)
    print(f"   {nom} : decalage = {d:+.2f} px   correlation={c:.4f}")

print("\n== controle negatif : tranche centrale de D200 decalee de 6 px ==")
b = prof(p2, 480, 600)
a = [0.0] * 6 + b[:-6]
d, c = decalage(a, b)
print(f"   decalage retrouve = {d:+.2f} px (attendu -6,00)  correlation={c:.4f}")
