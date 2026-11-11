#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""12 — Q1 (couleur de piste) : les deux couleurs de repos de l'interrupteur.

Le catalogue (l.466) nomme les deux : `Eteint` = BLANC alpha 0,18 et `Or` = #d9ab4e.
Le client compose en LINEAIRE : on PREDIT donc le pixel de `Eteint` par composition
lineaire du blanc a 0,18 sur le fond mesure, et on compare au pixel rendu.
Et on verifie QUAND la couleur change : pendant la course (anime) ou a l'arrivee.

Controle POSITIF : la piste allumee doit rendre #d9ab4e a <= 6/255 par canal.
Controle NEGATIF : la meme prediction faite en sRGB NAIF (melange des octets) doit
   TOMBER A COTE — sinon la mesure ne distingue pas les deux espaces et ne prouve rien.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def srgb(u):
    u = max(0.0, min(1.0, u))
    v = 12.92*u if u <= 0.0031308 else 1.055*(u ** (1/2.4)) - 0.055
    return v * 255.0

def mediane(im, x0, x1, y0, y1):
    p = im.load()
    vals = [[], [], []]
    for y in range(y0, y1):
        for x in range(x0, x1):
            for c in range(3): vals[c].append(p[x, y][c])
    return tuple(sorted(v)[len(v)//2] for v in vals)

cas = [("bascule-course-marche-sens1_avant_1080x1920.png", "ALLUME (Or)"),
       ("bascule-course-marche-sens1_t70ms_1080x1920.png", "en course, sens 1 (ancienne couleur attendue)"),
       ("bascule-course-marche-sens1_t140ms_1080x1920.png", "arrive, sens 1 (Eteint)"),
       ("bascule-course-marche-sens2_t0_1080x1920.png", "depart sens 2 (Eteint)"),
       ("bascule-course-marche-sens2_t70ms_1080x1920.png", "en course, sens 2 (ancienne couleur attendue)"),
       ("bascule-course-marche-sens2_t140ms_1080x1920.png", "arrive, sens 2 (Or)")]

print("### piste : mediane aux DEUX bouts (x 933..939 et x 1000..1006) ; le bout occupe")
print("    par le curseur se reconnait a son vert 224 (teinte du curseur) et est ecarte.")
for nom, quoi in cas:
    im = Image.open(os.path.join(BASE, nom)).convert("RGB")
    print("   ouvert %-52s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    g = mediane(im, 933, 939, 945, 965)
    d = mediane(im, 1000, 1006, 945, 965)
    piste = d if g[1] >= 215 else g
    bout = "droit" if g[1] >= 215 else "gauche"
    print("      %-46s gauche=%s droite=%s -> PISTE (bout %s) = %s"
          % (quoi, g, d, bout, piste))

print("\n### Or : token #d9ab4e = (217, 171, 78)")
im = Image.open(os.path.join(BASE, "bascule-course-marche-sens1_avant_1080x1920.png")).convert("RGB")
print("   ouvert bascule-course-marche-sens1_avant_1080x1920.png taille=%dx%d" % im.size)
or_mesure = mediane(im, 933, 939, 945, 965)
print("   mesure = %s ; ecart par canal = %s  -> CONTROLE POSITIF : %s"
      % (or_mesure, tuple(a-b for a, b in zip(or_mesure, (217,171,78))),
         "OK (<= 6/255)" if max(abs(a-b) for a, b in zip(or_mesure, (217,171,78))) <= 6 else "ECART"))

print("\n### Eteint : BLANC alpha 0,18 sur le fond (13,13,13)")
im2 = Image.open(os.path.join(BASE, "bascule-course-marche-sens1_t140ms_1080x1920.png")).convert("RGB")
print("   ouvert bascule-course-marche-sens1_t140ms_1080x1920.png taille=%dx%d" % im2.size)
et = mediane(im2, 975, 1000, 945, 965)   # a droite du curseur, qui est arrive a gauche
fond = (13, 13, 13)
pred_lin = tuple(round(srgb(0.18*lin(255) + 0.82*lin(f))) for f in fond)
pred_srgb = tuple(round(0.18*255 + 0.82*f) for f in fond)
print("   mesure           = %s" % (et,))
print("   prediction LINEAIRE = %s  (ecart %s)" % (pred_lin, tuple(a-b for a, b in zip(et, pred_lin))))
print("   prediction sRGB NAIVE = %s  (ecart %s)  <- CONTROLE NEGATIF : doit tomber a cote"
      % (pred_srgb, tuple(a-b for a, b in zip(et, pred_srgb))))
