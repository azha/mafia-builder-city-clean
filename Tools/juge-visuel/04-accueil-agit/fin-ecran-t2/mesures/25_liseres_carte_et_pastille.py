#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""25 — (a) le LISERE de la carte : profil vertical des pixels en traversant le bord gauche de la
carte, a mi-hauteur (la ou il n'y a ni coin arrondi ni texte) ; on imprime la suite des couleurs
pour voir combien de traits la carte porte et de quelle epaisseur.
(b) la pastille « DEJA TRANCHEE » de G03 : etendue du TRAIT POINTILLE (tan), centrage dans la carte.

Contrôles :
  POSITIF — le profil pris a deux hauteurs differentes de la MEME carte doit donner la meme suite.
  NEGATIF — le meme profil pris 60 px a gauche de la carte (plein vert) ne doit montrer aucune
            transition.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def profil(path, nom, y, x0, x1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("  %-30s y=%4d  [%s %s]" % (nom, y, os.path.basename(path)[:26], im.size))
    out = []
    prev = None
    for x in range(x0, x1):
        p = px[x, y]
        if prev is None or max(abs(p[i] - prev[i]) for i in range(3)) > 7:
            out.append("x=%d%s" % (x, str(p)))
            prev = p
    print("      " + "  ".join(out))


def pointille(path, nom, y0, y1, carte):
    """trait tan pointille : plus sombre que le papier mais pas rouge fonce"""
    im = Image.open(path)
    px = im.convert("RGB").load()
    pts = []
    for y in range(y0, y1):
        for x in range(carte[0], carte[2] + 1):
            r, g, b = px[x, y]
            if 150 < r < 215 and 110 < g < 185 and b < 165 and (r - b) > 35:
                pts.append((x, y))
    if len(pts) < 100:
        print("    %-30s rien (%d px)" % (nom, len(pts)))
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    l = max(xs) - min(xs) + 1
    print("    %-30s pointille x=[%4d..%4d] l=%3d px (%6.2f CSS)  y=[%4d..%4d] h=%2d px" %
          (nom, min(xs), max(xs), l, l / ECH, min(ys), max(ys), max(ys) - min(ys) + 1))
    print("        carte x=[%d..%d] : marge gauche=%d px (%.2f CSS)  marge droite=%d px (%.2f CSS)  => decentrage=%+d px (%+.2f CSS)" %
          (carte[0], carte[2], min(xs) - carte[0], (min(xs) - carte[0]) / ECH,
           carte[2] - max(xs), (carte[2] - max(xs)) / ECH,
           (min(xs) - carte[0]) - (carte[2] - max(xs)),
           ((min(xs) - carte[0]) - (carte[2] - max(xs))) / ECH))


R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G03 = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — profil en plein vert, 60 px a gauche de la carte")
profil(R7, "ref c7 vert nu", 1200, 30, 90)
profil(G05, "cap G05 vert nu", 1500, 25, 85)

print()
print(">>> LISERE — bord GAUCHE de la carte, a deux hauteurs")
profil(R7, "ref cadre 7", 1200, 95, 165)
profil(R7, "ref cadre 7", 1300, 95, 165)
profil(G05, "capture G05", 1500, 88, 158)
profil(G05, "capture G05", 1600, 88, 158)

print()
print(">>> LISERE — bord HAUT de la carte (colonne au milieu)")


def profil_v(path, nom, x, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("  %-30s x=%4d  [%s %s]" % (nom, x, os.path.basename(path)[:26], im.size))
    out = []
    prev = None
    for y in range(y0, y1):
        p = px[x, y]
        if prev is None or max(abs(p[i] - prev[i]) for i in range(3)) > 7:
            out.append("y=%d%s" % (y, str(p)))
            prev = p
    print("      " + "  ".join(out))


profil_v(R7, "ref cadre 7 haut", 400, 790, 850)
profil_v(G05, "capture G05 haut", 400, 1108, 1168)

print()
print(">>> PASTILLE « DEJA TRANCHEE » — trait pointille")
pointille(G03, "G03 2400", 1890, 1950, (99, 1236, 696, 1968))
pointille(G05, "G05 (controle negatif)", 1790, 1850, (100, 1127, 696, 1860))
