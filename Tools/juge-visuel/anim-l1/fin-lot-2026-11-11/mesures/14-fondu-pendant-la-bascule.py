#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""14 — QUEL fondu tourne pendant la capture de bascule.course ?

Fait mesure (03, instrument calibre a +-0,005 sur un point connu) : dans le scenario
bascule, l'alpha du CONTENU vaut 1,000 a `avant`, 0,000/0,012 a t0, 0,620 a t70, 0,982 a t140.
Donc un fondu plein cadre tourne pendant la course. Lequel ? J'ajuste la DUREE d'un ease-out
demarre au geste (journal : le depart est ecrit 1 ms apres le geste).

Controle positif : la duree de shell.entree, 160 ms, ajustee sur les 8 echantillons du
journal de shell.entree, doit ressortir a 160 ms.
Controle negatif : la duree 140 ms (celle de la course) doit etre REJETEE sur les memes
donnees de bascule si elle ne colle pas.
"""
import os

ICI = os.path.dirname(os.path.abspath(__file__))


def ease_out(t):
    if t <= 0:
        return 0.0
    if t >= 1:
        return 1.0
    x1, y1, x2, y2 = 0.0, 0.0, 0.58, 1.0
    lo, hi = 0.0, 1.0
    for _ in range(70):
        m = (lo + hi) / 2
        xm = 3 * (1 - m) ** 2 * m * x1 + 3 * (1 - m) * m * m * x2 + m ** 3
        if xm < t:
            lo = m
        else:
            hi = m
    m = (lo + hi) / 2
    return 3 * (1 - m) ** 2 * m * y1 + 3 * (1 - m) * m * m * y2 + m ** 3


print("(ce script ne lit pas d'image : il exploite les alphas mesures par 03-alpha-quantiles.py,")
print(" dont la sortie est collee dans rapport.md ; tailles d'images imprimees par 03.)")

print("\n== CONTROLE POSITIF : retrouver 160 ms sur les 8 echantillons de shell.entree ==")
SHELL = [(20, 0.199), (40, 0.378), (60, 0.541), (80, 0.685),
         (100, 0.808), (120, 0.907), (140, 0.974), (160, 1.000)]
best = None
for duree in range(100, 301, 5):
    err = max(abs(a - ease_out(t / duree)) for t, a in SHELL)
    if best is None or err < best[1]:
        best = (duree, err)
print(f"   duree ajustee = {best[0]} ms  (erreur max {best[1]:.4f})   attendu 160 ms")

# alphas MESURES SUR LES PIXELS par 03 (p5 %, instrument calibre)
BAS = [(0, 0.012), (70, 0.620), (140, 0.982)]       # t du journal ; depart ecrit a +1 ms
print("\n== alphas du contenu mesures sur les pixels (03) pendant bascule.course ==")
for t, a in BAS:
    print(f"   t={t:3d} ms : alpha mesure = {a:.3f}")

print("\n== quelle duree d'un ease-out demarre AU GESTE explique ces trois valeurs ? ==")
print(f"{'duree':>7s} {'t0':>8s} {'t70':>8s} {'t140':>8s} {'err max':>9s}   verdict")
lignes = []
for duree in [120, 140, 160, 180, 200, 250]:
    pred = [ease_out((t + 1) / duree) for t, _ in BAS]
    err = max(abs(a - p) for (_, a), p in zip(BAS, pred))
    lignes.append((duree, pred, err))
    v = "COMPATIBLE" if err <= 0.02 else "REJETEE"
    print(f"{duree:7d} {pred[0]:8.3f} {pred[1]:8.3f} {pred[2]:8.3f} {err:9.4f}   {v}")

m = min(lignes, key=lambda l: l[2])
print(f"\n   meilleure duree : {m[0]} ms (erreur max {m[2]:.4f})")
print("   -> 160 ms = la duree de shell.entree (catalogue l.360) ;"
      " 140 ms = celle de la course (l.365).")

print("\n== finesse : l'instant t0 a lui seul ==")
for duree in [140, 160]:
    print(f"   ease-out({1}/{duree}) = {ease_out(1.0/duree):.4f}   | mesure mediane = 0,012")
