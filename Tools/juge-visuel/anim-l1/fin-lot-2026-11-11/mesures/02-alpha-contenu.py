#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""02 — alpha EFFECTIF du contenu, estime sur les pixels.

Modele : Unity compose en LINEAIRE. Une couche a l'alpha a, posee sur du noir, donne
out_lin = a * src_lin. Donc a = lin(out) / lin(src), ou src est la MEME image a alpha plein.
On prend la MEDIANE sur les pixels assez clairs de la zone de contenu (robuste aux
elements qui changent : curseur, couleur de piste).

Controle positif  : shell t160 vs lui-meme => a = 1,000 ; shell t80 vs t160 => doit retrouver
                    le 0,685 ecrit par la regie dans journal.tsv (ecart < 0,03).
Controle negatif  : shell t0 vs t160 => a ~ 0 (et non 1) ; un modele qui rendrait tout pareil
                    serait rejete ici.
Zone de contenu   : deduite de shell-entree_t0 (alpha=0 => le ContentSlot est NOIR PUR),
                    les lignes entierement noires donnent les bornes y du ContentSlot.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))


def ouvre(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"   lu {n}  {im.size}")
    return im


S2L = [((c / 255.0 / 12.92) if c / 255.0 <= 0.04045 else (((c / 255.0) + 0.055) / 1.055) ** 2.4)
       for c in range(256)]


def bornes_contenu():
    im = ouvre("shell-entree_t0_1080x2400.png")
    px = im.load()
    noires = []
    for y in range(im.size[1]):
        noir = True
        for x in range(0, 1080, 7):
            r, g, b = px[x, y]
            if r > 3 or g > 3 or b > 3:
                noir = False
                break
        noires.append(noir)
    y0 = noires.index(True)
    y1 = len(noires) - 1 - noires[::-1].index(True)
    print(f"   lignes entierement noires a shell t0 : y={y0}..{y1} "
          f"({sum(noires)} lignes noires sur {len(noires)})")
    return y0, y1


def alpha(nom_out, nom_ref, y0, y1, seuil=40):
    a = ouvre(nom_out)
    b = ouvre(nom_ref)
    pa, pb = a.load(), b.load()
    rapports = []
    for y in range(y0, y1 + 1, 3):
        for x in range(0, 1080, 3):
            rr, rg, rb = pb[x, y]
            if max(rr, rg, rb) < seuil:      # reference trop sombre : rapport instable
                continue
            orr, og, ob = pa[x, y]
            lr, lo = S2L[rr] + S2L[rg] + S2L[rb], S2L[orr] + S2L[og] + S2L[ob]
            rapports.append(lo / lr)
    rapports.sort()
    n = len(rapports)
    med = rapports[n // 2]
    q1, q3 = rapports[n // 4], rapports[3 * n // 4]
    return med, q1, q3, n


print("== bornes du ContentSlot ==")
Y0, Y1 = bornes_contenu()
print()

REF_SHELL = "shell-entree_t160ms_1080x2400.png"
print("== CONTROLES de l'instrument (shell.entree, journal connu) ==")
for nom, attendu in [(REF_SHELL, 1.000),
                     ("shell-entree_t80ms_1080x2400.png", 0.685),
                     ("shell-entree_t0_1080x2400.png", 0.000)]:
    med, q1, q3, n = alpha(nom, REF_SHELL, Y0, Y1)
    print(f"   alpha({nom[:34]:34s}) = {med:.3f}  [q1 {q1:.3f} q3 {q3:.3f}, n={n}] "
          f" journal={attendu:.3f}  ecart={med-attendu:+.3f}")

print()
print("== bascule.course : alpha du CONTENU a chaque instant (ref = _avant) ==")
REF_BAS = "bascule-course_avant_1080x2400.png"
for nom in ["bascule-course_avant_1080x2400.png",
            "bascule-course_t0_1080x2400.png",
            "bascule-course_t70ms_1080x2400.png",
            "bascule-course_t140ms_1080x2400.png"]:
    med, q1, q3, n = alpha(nom, REF_BAS, Y0, Y1)
    print(f"   alpha({nom[:34]:34s}) = {med:.3f}  [q1 {q1:.3f} q3 {q3:.3f}, n={n}]")

print()
print("== bandeau.entree : le CONTENU (hors bandeau) bouge-t-il ? (ref = t0) ==")
REF_BAN = "bandeau-entree_t0_1080x2400.png"
for nom in ["bandeau-entree_t100ms_1080x2400.png",
            "bandeau-entree_t200ms_1080x2400.png"]:
    med, q1, q3, n = alpha(nom, REF_BAN, 400, Y1)   # 400 : sous la zone du bandeau
    print(f"   alpha({nom[:34]:34s}) = {med:.3f}  [q1 {q1:.3f} q3 {q3:.3f}, n={n}]")
