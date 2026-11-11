#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""07 — Q2 (position) : y du FILET HAUT du bandeau, et recouvrement du chrome.

REMPLACE l'estimateur de position du script 06, REJETÉ par son propre témoin :
06 rendait 208,9 / 209,6 / 211,7 / 216,5 là où la lecture BRUTE du script 05
(colonne x=250, valeurs imprimées pixel par pixel) donne 198 / 201 / 206 / 215.
06 attrapait aussi un « filet » à t0, où le bandeau est invisible (alpha 0).
Cause : son seuil (fond + 8) attrapait le CONTENU sous le bandeau (33,31,31).

Instrument de remplacement : le filet haut est la seule bande dont le canal rouge
dépasse 40 entre y=170 et y=232 sur la colonne x=250 (fond = 11 ; panneau du
bandeau = 12 ; contenu dessous = 33 ; filet = 53..81 selon l'alpha). Sous-pixel :
barycentre pondéré par (R - 11) sur le palier contigu R>25 autour du pic.

Contrôle POSITIF : le filet trouvé doit tomber sur les y lus à la main au script 05
(198 / 201 / 206 / 215, ±1 px) et être ABSENT à t0.
Contrôle NÉGATIF : sur `shell-entree_t160ms` (= le même écran SANS bandeau, sha256
identique à bandeau-entree_t0) l'instrument doit rendre ABSENT.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")
U_PX = 2.755     # 1 u de canal = 3,265 x 0,84375 px ecran

def charger(nom):
    im = Image.open(os.path.join(BASE, nom)).convert("RGB")
    print("   ouvert %-50s taille=%dx%d" % (nom, im.size[0], im.size[1]))
    return im

def filet_haut(im, x=250, y0=170, y1=232):
    p = im.load()
    pic = None; vmax = 0
    for y in range(y0, y1):
        v = p[x, y][0]
        if v >= 40 and v > vmax:
            vmax = v; pic = y
    if pic is None:
        return None, None
    a = pic
    while a - 1 >= y0 and p[x, a-1][0] > 25: a -= 1
    b = pic
    while b + 1 < y1 and p[x, b+1][0] > 25: b += 1
    s = sum(p[x, y][0] - 11 for y in range(a, b+1))
    bary = sum((y + 0.5) * (p[x, y][0] - 11) for y in range(a, b+1)) / s
    return bary, (a, b, vmax)

def bezier_y(xc, x2=0.58, y2=1.0):
    lo, hi = 0.0, 1.0
    for _ in range(90):
        s = (lo + hi) / 2
        x = 3*(1-s)*s*s*x2 + s**3
        if x < xc: lo = s
        else: hi = s
    s = (lo + hi) / 2
    return 3*(1-s)*s*s*y2 + s**3

print("### ease-out CSS cubic-bezier(0,0,0.58,1)")
for t in (0, 50, 70, 100, 200):
    print("    progres(%3d/200 = %.3f) = %.4f   -> offset attendu = %.3f u = %.2f px"
          % (t, t/200.0, bezier_y(t/200.0), 10*(1-bezier_y(t/200.0)), 10*(1-bezier_y(t/200.0))*U_PX))
print("")

print("### CONTROLE NEGATIF — ecran SANS bandeau")
im = charger("shell-entree_t160ms_1080x1920.png")
b, d = filet_haut(im)
print("    filet haut trouve : %s  (attendu : ABSENT)  -> %s" % (b, "OK" if b is None else "INSTRUMENT REJETE"))
print("")

for res in ("1080x1920", "1080x2400"):
    print("### %s" % res)
    noms = ["bandeau-entree_t0_%s.png" % res, "bandeau-entree_t50ms_%s.png" % res,
            "bandeau-entree_t70ms_%s.png" % res, "bandeau-entree_t100ms_%s.png" % res,
            "bandeau-entree_t200ms_%s.png" % res]
    att = {"t0": 10.0, "t50ms": 6.22, "t70ms": 4.91, "t100ms": 3.15, "t200ms": 0.0}
    ims = {n: charger(n) for n in noms}
    y200, _ = filet_haut(ims[noms[-1]])
    for n in noms:
        inst = n.split("_")[1]
        b, d = filet_haut(ims[n])
        if b is None:
            print("    %-8s filet haut ABSENT (bandeau invisible : alpha 0) ; journal %.2f u" % (inst, att[inst]))
            continue
        dy = y200 - b
        pred = att[inst] * U_PX
        ease = 10 * (1 - bezier_y(int(inst.replace("t","").replace("ms",""))/200.0)) * U_PX
        print("    %-8s filet haut y=%7.2f (palier %d..%d, pic R=%d)  ecart au repos=%5.2f px"
              "  | journal %.2f u = %5.2f px (delta %+.2f px) | ease-out pur = %5.2f px (delta %+.2f px)"
              % (inst, b, d[0], d[1], d[2], dy, att[inst], pred, dy - pred, ease, dy - ease))
    print("")

print("### Emprise horizontale du bandeau (ligne du filet haut) et bord du cadre")
for res in ("1080x1920", "1080x2400"):
    for inst in ("t50ms", "t70ms", "t100ms", "t200ms"):
        n = "bandeau-entree_%s_%s.png" % (inst, res)
        im = charger(n)
        b, d = filet_haut(im)
        y = d[0] + 1
        p = im.load()
        xs = [x for x in range(im.size[0]) if p[x, y][0] >= 30]
        print("    %-9s %s  filet sur y=%d : x de %d a %d (largeur %d px) ; marges %d / %d px"
              % (inst, res, y, min(xs), max(xs), max(xs)-min(xs)+1, min(xs), im.size[0]-1-max(xs)))
    print("")
