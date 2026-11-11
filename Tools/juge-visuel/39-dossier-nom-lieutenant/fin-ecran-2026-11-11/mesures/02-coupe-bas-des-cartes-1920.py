#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3/5 — le bas des cartes de pistes a 1080x1920 : fondu et troncature.

Mesure, a l'INTERIEUR de la carte 1 (« LA COMPTABILITE », piste eteinte) et de la carte 3
(train de vie), l'encre presente a chaque decalage dy sous la bordure haute de la carte,
et sa luminance, en 1920 ET en 2400. Les deux resolutions ont la MEME mise en page interne
(meme dy pour chaque element) : tout ce qui manque a 1920 est donc coupe ou efface, pas deplace.

CONTROLE POSITIF : les QUATRE barres de la carte (dy 97..205) doivent etre presentes et de meme
couleur aux deux resolutions — c'est la grandeur dont on sait qu'elle est egale.
CONTROLE NEGATIF : le tiret « — » (dy 240) doit sortir DIFFERENT entre 1920 et 2400 si
l'instrument discrimine ; s'il sort identique, l'instrument ne mesure pas le fondu.
"""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
# bordures hautes des cartes mesurees par 01-cartes-pistes.py
HAUT = {1920: 875, 2400: 976}
CARTES = {"C1": (75, 372), "C2": (391, 688), "C3": (707, 1004)}

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def encre_par_dy(im, x0, x1, yb, dy0, dy1):
    """Pour chaque dy, nb de px d'encre (ecart au fond local) et couleur la plus claire."""
    px = im.load(); H = im.size[1]
    out = []
    for dy in range(dy0, dy1+1):
        y = yb + dy
        if y >= H:
            out.append((dy, None, None, "HORS IMAGE"))
            continue
        vals = [px[x, y] for x in range(x0+6, x1-5)]
        Ls = sorted(lum(v) for v in vals)
        fond = Ls[len(Ls)//2]
        enc = [v for v in vals if lum(v) - fond > 10]
        if enc:
            best = max(enc, key=lum)
            out.append((dy, len(enc), best, ""))
        else:
            out.append((dy, 0, None, ""))
    return out

print("### Fichiers lus")
ims = {}
for res in (1920, 2400):
    p = f"{D}/captures/E13_Dossier_watched_fr_1080x{res}.png"
    ims[res] = Image.open(p).convert("RGB")
    print(f"  {p}  TAILLE LUE = {ims[res].size}")

for nom in ("C1", "C3"):
    x0, x1 = CARTES[nom]
    print(f"\n### Carte {nom}  x[{x0},{x1}]  — encre par dy sous la bordure haute de la carte")
    print(f"{'dy':>5} | {'1920 n/couleur':>26} | {'2400 n/couleur':>26}")
    a = dict((d[0], d) for d in encre_par_dy(ims[1920], x0, x1, HAUT[1920], 90, 320))
    b = dict((d[0], d) for d in encre_par_dy(ims[2400], x0, x1, HAUT[2400], 90, 320))
    for dy in range(90, 321):
        da, db = a[dy], b[dy]
        if (da[1] or 0) == 0 and (db[1] or 0) == 0:
            continue
        sa = f"{da[1]:4d} {da[2]}" if da[1] else ("   0 -" if da[3] == "" else da[3])
        sb = f"{db[1]:4d} {db[2]}" if db[1] else "   0 -"
        print(f"{dy:5d} | {sa:>26} | {sb:>26}")

print("\n### Resume par element (pic d'encre sur la plage)")
def pic(im, x0, x1, yb, dy0, dy1):
    d = encre_par_dy(im, x0, x1, yb, dy0, dy1)
    d = [t for t in d if t[1]]
    if not d:
        return None
    return max(d, key=lambda t: t[1])

elements = [("C1 barre 1", "C1", 97, 118), ("C1 barre 4", "C1", 184, 205),
            ("C1 tiret —", "C1", 236, 246), ("C1 « pas encore sur la table »", "C1", 262, 290),
            ("C3 barre 4 (or)", "C3", 184, 205), ("C3 mot de gravite", "C3", 222, 258)]
for lib, carte, d0, d1 in elements:
    x0, x1 = CARTES[carte]
    pa = pic(ims[1920], x0, x1, HAUT[1920], d0, d1)
    pb = pic(ims[2400], x0, x1, HAUT[2400], d0, d1)
    fa = f"dy={pa[0]} n={pa[1]} {pa[2]}" if pa else "ABSENT"
    fb = f"dy={pb[0]} n={pb[1]} {pb[2]}" if pb else "ABSENT"
    print(f"  {lib:34s} 1920: {fa:34s} | 2400: {fb}")
