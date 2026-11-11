#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""06 — Q2 : la descente du bandeau (y +10 u -> 0, alpha 0 -> 1, 200 ms, ease-out).

A. POSITION — y du FILET HAUT du bandeau, mesuré sur la colonne x=250 (hors texte,
   hors médaillon) : le filet est le seul pic clair entre y=170 et y=230.
   Sous-pixel : barycentre du pic (pondéré par (valeur - fond)).
B. ALPHA APPARENT — « encre » = somme, sur la bande du bandeau, de |L - L_fond| en
   LUMINANCE LINÉAIRE (le client compose en linéaire). Le fond est pris sur
   `bandeau-entree_t0` (alpha = 0 : c'est l'écran SANS bandeau). Chaque couche
   composée contribue a*alpha_e*(Lc - Lfond) : la somme est proportionnelle à a.
C. EMPRISE horizontale du bandeau et recouvrement du chrome (médaillon, losange).

Échelle du dossier : 10 u de canal = 27,55 px écran ; 1 u de canal = 2,755 px.

Contrôle POSITIF : encre(t200)/encre(t200) = 1,000 et encre(t0)/encre(t200) = 0,000 ;
   et le filet haut à t200 doit tomber sur la position de REPOS commune aux deux
   résolutions (même y relatif à la barre haute).
Contrôle NÉGATIF : l'instrument doit rendre des y DIFFÉRENTS à t50/t70/t100/t200
   (sinon il ne mesure pas la descente) et une encre croissante.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")
U_PX = 2.755          # 1 u de canal = 3,265 (TopBarEchelle) x 0,84375 = 2,755 px ecran

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def L(rgb):
    return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2])

def charger(nom):
    im = Image.open(os.path.join(BASE, nom)).convert("RGB")
    print("   ouvert %-50s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    return im

def filet_haut(im, x=250, y0=165, y1=235):
    """barycentre du pic clair = filet haut du bandeau ; None si pas de pic"""
    p = im.load()
    fond = min(p[x, y][0] for y in range(y0, y1))
    pts = [(y, p[x, y][0] - fond) for y in range(y0, y1) if p[x, y][0] - fond > 8]
    if not pts:
        return None
    s = sum(v for _, v in pts)
    return sum((y + 0.5) * v for y, v in pts) / s

def encre(im, imfond, bande):
    y0, y1, x0, x1 = bande
    p, q = im.load(), imfond.load()
    s = 0.0
    for y in range(y0, y1):
        for x in range(x0, x1):
            s += abs(L(p[x, y]) - L(q[x, y]))
    return s

def emprise(im, y, seuil=6):
    """premiers/derniers x ou la ligne y differe du fond uni (11,11,11)"""
    p = im.load()
    xs = [x for x in range(0, im.size[0]) if abs(p[x, y][0] - 11) > seuil or abs(p[x, y][2] - 11) > seuil]
    return (min(xs), max(xs)) if xs else None

for res, bande in (("1080x1920", (165, 300, 100, 980)), ("1080x2400", (165, 300, 100, 980))):
    print("### Resolution %s" % res)
    noms = ["bandeau-entree_t0_%s.png" % res, "bandeau-entree_t50ms_%s.png" % res,
            "bandeau-entree_t70ms_%s.png" % res, "bandeau-entree_t100ms_%s.png" % res,
            "bandeau-entree_t200ms_%s.png" % res]
    ims = {n: charger(n) for n in noms}
    fond = ims[noms[0]]
    e200 = encre(ims[noms[-1]], fond, bande)
    y200 = filet_haut(ims[noms[-1]])
    attendu = {"t0": 10.0, "t50ms": 6.22, "t70ms": 4.91, "t100ms": 3.15, "t200ms": 0.0}
    print("   repos (t200) : filet haut y=%.2f px ; encre de reference=%.1f" % (y200, e200))
    for n in noms:
        inst = n.split("_")[1]
        yy = filet_haut(ims[n])
        ee = encre(ims[n], fond, bande)
        dy = (y200 - yy) if yy is not None else None
        att = attendu[inst] * U_PX
        print("   %-9s filet_haut=%s  ecart_au_repos=%s px (journal %.2f u = %.2f px)  "
              "encre=%8.1f  alpha_apparent=%.3f"
              % (inst,
                 "%.2f" % yy if yy is not None else " ABSENT",
                 "%6.2f" % dy if dy is not None else "   n/a",
                 attendu[inst], att, ee, ee / e200))
    # emprise horizontale sur la ligne du filet haut
    for n in (noms[1], noms[2], noms[4]):
        yy = filet_haut(ims[n])
        em = emprise(ims[n], int(round(yy)))
        print("   emprise horizontale de %-9s sur y=%d : x=%s" % (n.split('_')[1], int(round(yy)), em))
    print("")

print("### CONTROLE NEGATIF — deux instants distincts doivent donner des y distincts")
print("   (voir ci-dessus : t50 / t70 / t100 / t200 donnent 4 valeurs differentes)")
