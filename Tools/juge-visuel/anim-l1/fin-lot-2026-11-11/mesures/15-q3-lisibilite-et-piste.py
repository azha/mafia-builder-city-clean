#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""15 — Q3 : lisibilite des etats intermediaires, UN seul curseur, couleur de piste.

(a) contraste WCAG du titre et du corps de texte de l'ecran Famille a t80ms et a t160ms ;
(b) le profil de la piste a chaque instant n'a-t-il qu'UN maximum (pas deux positions du
    curseur a la fois) ;
(c) la couleur de la piste, RENORMALISEE par l'alpha du contenu mesure en 03, est-elle la
    MEME a `avant`, t0 et t70 (= non animee) et DIFFERENTE a t140 (= posee a l'arrivee) ?

Controle positif (c) : avant -> t0 (meme couleur physique), ecart attendu < 6/255 par canal.
Controle negatif (c) : avant -> t140 (or -> blanc 18 %), ecart attendu tres superieur.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
S2L = [((c / 255.0 / 12.92) if c / 255.0 <= 0.04045 else (((c / 255.0) + 0.055) / 1.055) ** 2.4)
       for c in range(256)]


def L2S(v):
    v = max(0.0, min(1.0, v))
    s = 12.92 * v if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055
    return s * 255.0


def lire(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n} {im.size}")
    return im


def lum(p):
    return 0.2126 * S2L[p[0]] + 0.7152 * S2L[p[1]] + 0.0722 * S2L[p[2]]


def contraste(p, xa, xb, ya, yb):
    e = sorted((lum(p[x, y]), p[x, y]) for y in range(ya, yb) for x in range(xa, xb))
    n = len(e)
    f, t = e[n // 10][0], e[-max(1, n // 50)][0]
    return (max(f, t) + 0.05) / (min(f, t) + 0.05), e[n // 10][1], e[-max(1, n // 50)][1]


print("== (a) contraste du contenu de l'ecran Famille ==")
i80 = lire("shell-entree_t80ms_1080x2400.png")
i160 = lire("shell-entree_t160ms_1080x2400.png")
ZONES = [("titre LA FAMILLE", 150, 650, 285, 320), ("corps 'Au repos : il ne reste'", 230, 850, 985, 1015)]
for nz, xa, xb, ya, yb in ZONES:
    for nn, im in [("t80ms  (alpha 0,685)", i80), ("t160ms (final)", i160)]:
        r, f, t = contraste(im.load(), xa, xb, ya, yb)
        print(f"   {nz:32s} {nn:22s} fond={f} encre={t} contraste={r:5.2f}:1")

print("\n== (b) un seul curseur ? maxima locaux du profil de la piste ==")
BANDE = (955, 982)
XG, XD = 932, 1007
for n in ["bascule-course_avant_1080x2400.png", "bascule-course_t0_1080x2400.png",
          "bascule-course_t70ms_1080x2400.png", "bascule-course_t140ms_1080x2400.png"]:
    im = lire(n)
    p = im.load()
    pr = [sum((p[x, y][0] * 299 + p[x, y][1] * 587 + p[x, y][2] * 114) / 1000.0
              for y in range(*BANDE)) / (BANDE[1] - BANDE[0]) for x in range(XG, XD + 1)]
    mn, mx = min(pr), max(pr)
    seuil = mn + 0.6 * (mx - mn)
    zones, dans = 0, False
    for v in pr:
        if v > seuil and not dans:
            zones += 1
            dans = True
        elif v <= seuil:
            dans = False
    print(f"      min={mn:6.1f} max={mx:6.1f}  zones au-dessus de 60 % = {zones}"
          f"  -> {'UN SEUL curseur' if zones == 1 else 'ANOMALIE'}")

print("\n== (c) couleur de la piste, renormalisee par l'alpha du contenu (03) ==")
ALPHA = {"bascule-course_avant_1080x2400.png": 1.000,
         "bascule-course_t0_1080x2400.png": 0.0106,
         "bascule-course_t70ms_1080x2400.png": 0.620,
         "bascule-course_t140ms_1080x2400.png": 0.982}
ref = None
for n, a in ALPHA.items():
    im = lire(n)
    p = im.load()
    # coin GAUCHE de la piste : sans curseur a `avant`/t0, avec curseur a t140 -> on prend
    # le coin oppose au curseur a chaque instant. Ici : x 936..948 (gauche) pour avant/t0/t70,
    # x 992..1004 (droite) pour t140.
    xa, xb = (992, 1004) if "t140" in n else (936, 948)
    ech = []
    for k in range(3):
        v = sorted(S2L[p[x, y][k]] for y in range(960, 978) for x in range(xa, xb))
        ech.append(L2S(v[len(v) // 2] / a))
    print(f"      piste (x {xa}..{xb}) renormalisee = "
          f"({ech[0]:.0f}, {ech[1]:.0f}, {ech[2]:.0f})")
    if ref is None:
        ref = ech
    else:
        print(f"         ecart a `avant` par canal : "
              f"({ech[0]-ref[0]:+.0f}, {ech[1]-ref[1]:+.0f}, {ech[2]-ref[2]:+.0f})")
print("   | catalogue : Eteint = blanc alpha 0,18 ; Or = #d9ab4e = (217, 171, 78)")
