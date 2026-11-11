#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""04 — REMPLACE 03 (dont les detecteurs ont RATE leur contrôle negatif : le jeton dore et le texte
or etaient comptes comme « papier », bbox polluee, rondeur du jeton 0,26).

Methode : par LIGNE, le plus long RUN contigu de pixels « papier ». La carte est la seule chose assez
large (run >= 300 px) ; le jeton (diam ~140 px) et les glyphes ne peuvent pas l'etre. Idem pour le
jeton avec un run « dore » >= 80 px dans la bande a droite de la carte.

Contrôles :
  POSITIF  — la largeur de l'ecran est 1080 px dans les deux mondes ; le ratio l/h de la carte est
             invariant d'echelle et doit etre LE MEME dans les 3 references de cadre 6/7 si la carte
             est la meme forme.
  NEGATIF  — cadre 5 (aucune carte papier, aucun jeton) : les deux detecteurs doivent rendre AUCUNE
             ligne. Si l'un trouve quelque chose, ses chiffres sont jetes.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def est_papier(p):
    r, g, b = p
    return r > 195 and g > 180 and b > 130 and (r - b) > 20


def est_dore(p):
    r, g, b = p
    return r > 165 and 120 < g < 225 and b < 160 and (r - b) > 55


def plus_long_run(px, y, w, pred, x0=0, x1=None):
    x1 = w if x1 is None else x1
    best = (0, -1, -1)
    cur = 0
    deb = -1
    for x in range(x0, x1):
        if pred(px[x, y]):
            if cur == 0:
                deb = x
            cur += 1
            if cur > best[0]:
                best = (cur, deb, x)
        else:
            cur = 0
    return best


def zone(im, pred, seuil, x0=0, x1=None):
    px = im.convert("RGB").load()
    w, h = im.size
    lignes = []
    for y in range(h):
        n, a, b = plus_long_run(px, y, w, pred, x0, x1)
        if n >= seuil:
            lignes.append((y, a, b, n))
    return lignes


def med(v):
    v = sorted(v)
    return v[len(v) // 2]


def rapport(path):
    im = Image.open(path)
    w, h = im.size
    print("=== %s  %dx%d" % (os.path.basename(path), w, h))
    L = zone(im, est_papier, 300)
    if not L:
        print("    CARTE : aucune ligne (detecteur muet)")
        cx0 = cx1 = cy0 = cy1 = None
    else:
        cy0, cy1 = L[0][0], L[-1][0]
        cx0 = med([l[1] for l in L])
        cx1 = med([l[2] for l in L])
        cw = cx1 - cx0 + 1
        ch = cy1 - cy0 + 1
        print("    CARTE  x=[%d..%d] y=[%d..%d]  l=%d px (%.1f CSS, %.2f%% ecran)  h=%d px (%.1f CSS)" %
              (cx0, cx1, cy0, cy1, cw, cw / ECH, 100.0 * cw / w, ch, ch / ECH))
        print("           RATIO l/h = %.4f   marge gauche=%d px (%.1f CSS)  marge droite ecran=%d px (%.1f CSS)" %
              (cw / float(ch), cx0, cx0 / ECH, w - 1 - cx1, (w - 1 - cx1) / ECH))
    if cx1 is not None:
        J = zone(im, est_dore, 80, x0=cx1 + 6, x1=w)
    else:
        J = []
    if not J:
        print("    JETON  : aucune ligne (detecteur muet)")
    else:
        jy0, jy1 = J[0][0], J[-1][0]
        jx0 = min(l[1] for l in J)
        jx1 = max(l[2] for l in J)
        jw = jx1 - jx0 + 1
        jh = jy1 - jy0 + 1
        print("    JETON  x=[%d..%d] y=[%d..%d]  diam_x=%d (%.1f CSS)  diam_y=%d  RONDEUR=%.3f" %
              (jx0, jx1, jy0, jy1, jw, jw / ECH, jh, jw / float(jh)))
        if cx1 is not None:
            print("           diam/largeur_carte=%.3f   centre_x=%.1f (%.2f%% ecran)   bord gauche jeton - bord droit carte = %d px (%.1f CSS)" %
                  (jw / float(cx1 - cx0 + 1), (jx0 + jx1) / 2.0, 100.0 * ((jx0 + jx1) / 2.0) / w, jx0 - cx1, (jx0 - cx1) / ECH))
    print()
    return (cx0, cy0, cx1, cy1)


print(">>> CONTROLE NEGATIF — cadre 5 (ni carte papier ni jeton)")
rapport(os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"))

print(">>> REFERENCES")
rapport(os.path.join(REF, "cadre-6-apres-geste-executed.png"))
rapport(os.path.join(REF, "cadre-7-echec-1re-cible.png"))

print(">>> CAPTURES 1080x2400")
for f in ["G01_ApresGeste_executed", "G02_ApresGeste_noted", "G03_ApresGeste_deja_tranchee",
          "G04_ApresGeste_404_plus_la", "G05_ApresGeste_premiere_cible_en_echec",
          "G06_ApresGeste_noted_structurelle"]:
    rapport(os.path.join(CAP, f + "_c3aa3bbdb_b35bdd6cb_1080x2400.png"))

print(">>> CAPTURES 1080x1920")
for f in ["G01_ApresGeste_executed", "G05_ApresGeste_premiere_cible_en_echec",
          "G03_ApresGeste_deja_tranchee"]:
    rapport(os.path.join(CAP, f + "_c3aa3bbdb_b35bdd6cb_1080x1920.png"))
