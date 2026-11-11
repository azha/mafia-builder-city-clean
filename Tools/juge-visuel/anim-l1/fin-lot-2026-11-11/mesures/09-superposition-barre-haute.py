#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""09 — le bandeau passe-t-il SUR la barre haute pendant sa descente ? (Q3)

La descente va de +27,55 px (t0) a 0 (t200). Je mesure (1) ou se trouve l'ENCRE de la barre
haute sur le fond seul (= bandeau-entree_t0, ou alpha=0), (2) la trajectoire du bord HAUT du
bandeau, et (3) l'instant ou ce bord repasse sous la barre. Les captures ne couvrant que
t0 / t100 / t200, l'intervalle 0 < t < 100 ms est RECONSTRUIT (courbe validee en 06), ce que
le rapport doit dire.

Controle positif : sur le fond seul, les lignes de la barre haute (y<204) doivent porter de
l'encre, et les lignes du ContentSlot vide (shell t0, y 204..2161) ne doivent porter AUCUNE
encre — c'est la meme frontiere, trouvee par deux images independantes.
Controle negatif : une ligne prise dans le ContentSlot du fond (y=1500) doit, elle, porter de
l'encre (sinon je mesure une image vide).
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
ECHELLE = 3.265 * 0.84375


def bezier_out(t):
    x1, y1, x2, y2 = 0.0, 0.0, 0.58, 1.0
    lo, hi = 0.0, 1.0
    for _ in range(80):
        m = (lo + hi) / 2
        xm = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
        if xm < t:
            lo = m
        else:
            hi = m
    m = (lo + hi) / 2
    return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3


fond = Image.open(os.path.join(D, "bandeau-entree_t0_1080x2400.png")).convert("RGB")
vide = Image.open(os.path.join(D, "shell-entree_t0_1080x2400.png")).convert("RGB")
print("fond (bandeau t0) :", fond.size, " | ContentSlot vide (shell t0) :", vide.size)
pf, pv = fond.load(), vide.load()


def encre(p, y, seuil=28):
    return sum(1 for x in range(1080) if max(p[x, y]) > seuil)


print("\n== encre par ligne, barre haute et debut du contenu (fond seul) ==")
print(f"{'y':>5s} {'encre fond':>11s} {'encre ContentSlot vide':>24s}")
for y in list(range(150, 230, 5)):
    print(f"{y:5d} {encre(pf, y):11d} {encre(pv, y):24d}")

print("\n== controle positif : frontiere ContentSlot = 204 (shell t0) ==")
pre = [y for y in range(190, 215) if encre(pv, y) > 0]
print(f"   dernieres lignes porteuses d'encre dans shell t0 avant 215 : {pre}")
print("\n== controle negatif : ligne y=1500 du fond (doit porter de l'encre) ==")
print(f"   encre(fond, 1500) = {encre(pf, 1500)} px")

print("\n== trajectoire du bord HAUT du bandeau (repos mesure en 07 : y=215) ==")
REPOS = 215
print(f"{'t (ms)':>7s} {'alpha':>7s} {'offset px':>10s} {'bord haut y':>12s} "
      f"{'sous la barre (>=204) ?':>24s}")
for t in [0, 20, 40, 60, 80, 86, 100, 140, 200]:
    p = bezier_out(t / 200.0)
    off = 10.0 * (1 - p) * ECHELLE
    y = REPOS - off
    print(f"{t:7d} {p:7.3f} {off:10.2f} {y:12.1f} {('OUI' if y >= 204 else 'NON'):>24s}")

print("\n== combien d'encre de barre haute dans la bande balayee (y 187..204) ? ==")
tot = sum(encre(pf, y) for y in range(187, 204))
print(f"   {tot} px d'encre sur 17 lignes x 1080 = {100.0*tot/(17*1080):.2f} % de la bande")
