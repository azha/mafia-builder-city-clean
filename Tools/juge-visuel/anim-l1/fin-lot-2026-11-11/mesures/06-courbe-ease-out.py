#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""06 — « ease-out » est-il la courbe CSS cubic-bezier(0, 0, 0.58, 1) ?
Je calcule la courbe moi-meme (Newton + bissection sur x(s)) et je confronte CHAQUE valeur
de captures/journal.tsv aux trois candidates.

Controle positif : la courbe doit rendre y(0)=0 et y(1)=1 exactement.
Controle NEGATIF (exige par dossier.md) : le meme test applique a `lineaire` et a
`ease-in` cubic-bezier(0.42, 0, 1, 1) doit les REJETER sur les memes donnees.
Ce script ne lit pas d'image : il lit journal.tsv (chemin et nb de lignes imprimes).
"""
import os

ICI = os.path.dirname(os.path.abspath(__file__))
J = os.path.normpath(os.path.join(ICI, "..", "captures", "journal.tsv"))


def bezier(x1, y1, x2, y2):
    def x_de_s(s):
        return 3 * (1 - s) ** 2 * s * x1 + 3 * (1 - s) * s * s * x2 + s ** 3

    def y_de_s(s):
        return 3 * (1 - s) ** 2 * s * y1 + 3 * (1 - s) * s * s * y2 + s ** 3

    def f(t):
        lo, hi = 0.0, 1.0
        for _ in range(80):
            mid = (lo + hi) / 2
            if x_de_s(mid) < t:
                lo = mid
            else:
                hi = mid
        return y_de_s((lo + hi) / 2)
    return f


COURBES = {
    "ease-out  cb(0,0,.58,1)": bezier(0.0, 0.0, 0.58, 1.0),
    "lineaire               ": (lambda t: t),
    "ease-in   cb(.42,0,1,1)": bezier(0.42, 0.0, 1.0, 1.0),
}

print("== controle positif : bornes de la courbe ==")
for n, f in COURBES.items():
    print(f"   {n}  y(0)={f(0.0):.6f}  y(1)={f(1.0):.6f}  y(0,5)={f(0.5):.4f}")

lignes = open(J, encoding="utf-8").read().splitlines()
print(f"\n   journal lu : {J}  ({len(lignes)} lignes)")

# (scenario, instant_ms, duree_ms, grandeur, valeur mesuree par la regie, conversion -> progres)
OBS = [
    ("shell.entree  alpha", 20, 160, 0.199, lambda v: v),
    ("shell.entree  alpha", 40, 160, 0.378, lambda v: v),
    ("shell.entree  alpha", 60, 160, 0.541, lambda v: v),
    ("shell.entree  alpha", 80, 160, 0.685, lambda v: v),
    ("shell.entree  alpha", 100, 160, 0.808, lambda v: v),
    ("shell.entree  alpha", 120, 160, 0.907, lambda v: v),
    ("shell.entree  alpha", 140, 160, 0.974, lambda v: v),
    ("shell.entree  alpha", 160, 160, 1.000, lambda v: v),
    ("bandeau       alpha", 0, 200, 0.000, lambda v: v),
    ("bandeau       alpha", 100, 200, 0.685, lambda v: v),
    ("bandeau       alpha", 200, 200, 1.000, lambda v: v),
    ("bandeau       y (u)", 0, 200, 10.00, lambda v: 1 - v / 10.0),
    ("bandeau       y (u)", 100, 200, 3.15, lambda v: 1 - v / 10.0),
    ("bandeau       y (u)", 200, 200, 0.00, lambda v: 1 - v / 10.0),
    ("bascule       x (u)", 0, 140, 46.93, lambda v: (46.93 - v) / 42.66),
    ("bascule       x (u)", 70, 140, 17.70, lambda v: (46.93 - v) / 42.66),
    ("bascule       x (u)", 140, 140, 4.27, lambda v: (46.93 - v) / 42.66),
]

print(f"\n{'grandeur':20s} {'t (ms)':>7s} {'valeur':>8s} {'progres':>8s}   "
      + "   ".join(f"{n:>11s}" for n in COURBES))
ecarts = {n: [] for n in COURBES}
for nom, t, duree, val, conv in OBS:
    p = conv(val)
    frac = t / duree
    bout = []
    for n, f in COURBES.items():
        d = p - f(frac)
        ecarts[n].append(abs(d))
        bout.append(f"{d:+11.4f}")
    print(f"{nom:20s} {t:7d} {val:8.3f} {p:8.4f}   " + "   ".join(bout))

print("\n== verdict de courbe (ecart ABSOLU MAX sur les 17 points) ==")
for n in COURBES:
    m = max(ecarts[n])
    print(f"   {n} : max |ecart| = {m:.4f}   -> {'COMPATIBLE' if m <= 0.01 else 'REJETEE'}")
