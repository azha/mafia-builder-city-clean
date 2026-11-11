#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""03 — alpha effectif, estimateur DEBIAISE.

Pourquoi : dans 02, la mediane surestime (+0,049 sur un point connu). Demonstration :
un groupe d'alpha g sur une pile [texte at sur panneau ap sur noir] rend
   out(g)/out(1) = g * (at*T + ap*P - at*ap*g*P) / (at*T + ap*P - at*ap*P)   >= g,
avec EGALITE la ou le contenu est OPAQUE (at = 1). Le vrai g est donc la BORNE
INFERIEURE des rapports : on lit un quantile BAS, pas la mediane.

Controle positif : shell t80 vs t160 doit retrouver 0,685 (journal) a un quantile bas.
Controle negatif : la meme lecture sur shell t160 vs t160 doit rendre 1,000 (et non 0,685),
                   et sur shell t0 vs t160 rendre 0,000.
Controle negatif 2 : le quantile bas ne doit PAS descendre sous le journal (sinon il ne
                   mesure que du bruit) — on imprime p00,5 pour le voir.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
S2L = [((c / 255.0 / 12.92) if c / 255.0 <= 0.04045 else (((c / 255.0) + 0.055) / 1.055) ** 2.4)
       for c in range(256)]


def ouvre(n):
    im = Image.open(os.path.join(D, n)).convert("RGB")
    return im, im.size


def rapports(nom_out, nom_ref, y0, y1, seuil=90):
    a, ta = ouvre(nom_out)
    b, tb = ouvre(nom_ref)
    print(f"   {nom_out} {ta}  /  {nom_ref} {tb}   zone y={y0}..{y1}, ref>{seuil}")
    pa, pb = a.load(), b.load()
    r = []
    for y in range(y0, y1 + 1, 2):
        for x in range(0, 1080, 2):
            rr, rg, rb = pb[x, y]
            if min(rr, rg, rb) < seuil:     # pixels CLAIRS et peu bruites
                continue
            orr, og, ob = pa[x, y]
            lr = S2L[rr] + S2L[rg] + S2L[rb]
            lo = S2L[orr] + S2L[og] + S2L[ob]
            r.append(lo / lr)
    r.sort()
    return r


def ligne(nom, ref, y0, y1, attendu=None):
    r = rapports(nom, ref, y0, y1)
    n = len(r)
    if n < 200:
        print(f"      !! seulement {n} pixels — non concluant")
        return
    q = lambda p: r[max(0, min(n - 1, int(p * n)))]
    txt = (f"      n={n:6d}  p0.5%={q(0.005):.3f}  p2%={q(0.02):.3f}  p5%={q(0.05):.3f}  "
           f"p10%={q(0.10):.3f}  med={q(0.50):.3f}")
    if attendu is not None:
        txt += f"   | journal={attendu:.3f}"
    print(txt)


Y0, Y1 = 204, 2161          # bornes du ContentSlot, etablies par 02-alpha-contenu.py
REF_SHELL = "shell-entree_t160ms_1080x2400.png"
print("== CONTROLES (shell.entree — alpha connu par journal.tsv) ==")
ligne(REF_SHELL, REF_SHELL, Y0, Y1, 1.000)
ligne("shell-entree_t80ms_1080x2400.png", REF_SHELL, Y0, Y1, 0.685)
ligne("shell-entree_t0_1080x2400.png", REF_SHELL, Y0, Y1, 0.000)

print()
print("== bascule.course — alpha du CONTENU (ref = bascule-course_avant) ==")
REF_BAS = "bascule-course_avant_1080x2400.png"
for nom in ["bascule-course_avant_1080x2400.png",
            "bascule-course_t0_1080x2400.png",
            "bascule-course_t70ms_1080x2400.png",
            "bascule-course_t140ms_1080x2400.png"]:
    ligne(nom, REF_BAS, Y0, Y1)
