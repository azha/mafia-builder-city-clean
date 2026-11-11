#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""17 — course du curseur AU SOUS-PIXEL (05 ne resolvait que le px entier).

Pour chaque instant : profil de la piste, plateaux (piste / curseur) echantillonnes du COTE
OU LE CURSEUR N'EST PAS, bords du curseur a mi-hauteur par interpolation lineaire, centre =
milieu des deux bords.

Controle positif : la LARGEUR du curseur doit sortir identique (~35,6 px) aux 4 instants —
elle ne change pas pendant une translation. Un instant dont la largeur derive est a jeter.
Controle negatif : les positions mesurees doivent REJETER la courbe lineaire a t70.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
U = 0.84375
X0, X1 = 900, 1040
Y0, Y1 = 962, 976


def pr_de(nom):
    im = Image.open(os.path.join(D, nom)).convert("RGB")
    print(f"   lu {nom} {im.size}")
    p = im.load()
    return [sum((p[x, y][0] * 299 + p[x, y][1] * 587 + p[x, y][2] * 114) / 1000.0
                for y in range(Y0, Y1)) / (Y1 - Y0) for x in range(X0, X1)]


def bords(pr, bas, haut):
    s = (bas + haut) / 2.0
    xs = [i for i, v in enumerate(pr) if v > s]
    g, d = xs[0], xs[-1]
    fg = (s - pr[g - 1]) / (pr[g] - pr[g - 1]) if pr[g] != pr[g - 1] else 0.0
    fd = (pr[d] - s) / (pr[d] - pr[d + 1]) if pr[d] != pr[d + 1] else 0.0
    return X0 + g - 1 + fg, X0 + d + fd


# cote SANS curseur a chaque instant (le curseur part a DROITE et finit a GAUCHE)
COTE = {"bascule-course_avant_1080x2400.png": (936, 952),
        "bascule-course_t0_1080x2400.png": (936, 952),
        "bascule-course_t70ms_1080x2400.png": (936, 948),
        "bascule-course_t140ms_1080x2400.png": (990, 1004)}
CENTRE_CURSEUR = {"bascule-course_avant_1080x2400.png": (975, 998),
                  "bascule-course_t0_1080x2400.png": (975, 998),
                  "bascule-course_t70ms_1080x2400.png": (952, 972),
                  "bascule-course_t140ms_1080x2400.png": (942, 960)}

print("== centre du curseur, au sous-pixel ==")
res = {}
for n in COTE:
    pr = pr_de(n)
    a, b = COTE[n]
    piste = sum(pr[a - X0:b - X0]) / (b - a)
    a2, b2 = CENTRE_CURSEUR[n]
    curs = sum(pr[a2 - X0:b2 - X0]) / (b2 - a2)
    g, d = bords(pr, piste, curs)
    c = (g + d) / 2.0
    res[n] = (c, d - g)
    print(f"   {n[:38]:38s} piste={piste:6.1f} curseur={curs:6.1f}  "
          f"bords={g:7.2f}..{d:7.2f}  centre={c:7.2f}  largeur={d-g:5.2f} px")

print("\n== controle positif : largeur du curseur constante ? ==")
larg = [v[1] for v in res.values()]
print(f"   largeurs = {[f'{v:.2f}' for v in larg]}   etendue = {max(larg)-min(larg):.2f} px")

A = res["bascule-course_avant_1080x2400.png"][0]
T0 = res["bascule-course_t0_1080x2400.png"][0]
T70 = res["bascule-course_t70ms_1080x2400.png"][0]
T140 = res["bascule-course_t140ms_1080x2400.png"][0]

print("\n== Q1 : la course ==")
print(f"   `avant` et t0 (meme position physique attendue) : ecart = {T0-A:+.2f} px"
      f"  ({(T0-A)/U:+.2f} u)")
print(f"   course t0 -> t140 = {T0-T140:.2f} px = {(T0-T140)/U:.2f} u"
      f"   | attendu Dx = 42,67 u = {42.67*U:.2f} px   ecart = {(T0-T140)-42.67*U:+.2f} px")
print(f"   fraction parcourue a t70 = {(T0-T70)/(T0-T140):.3f}")
print("\n== controle negatif : quelle courbe colle a t70 ? ==")
for nom, f in [("ease-out 0,685", 0.685), ("lineaire 0,500", 0.500), ("ease-in 0,315", 0.315)]:
    att = T0 - f * (T0 - T140)
    print(f"   {nom} -> centre attendu {att:7.2f}  ecart au mesure ({T70:.2f}) = "
          f"{T70-att:+5.2f} px  {'RETENU' if abs(T70-att) <= 1.0 else 'REJETE'}")
