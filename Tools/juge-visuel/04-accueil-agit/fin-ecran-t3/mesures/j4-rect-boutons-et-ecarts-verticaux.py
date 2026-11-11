#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""POINT 1 (complement) — rect EXACT du bouton primaire (aplat or, bord franc), ecart
vertical bouton -> 1re ligne de consequence, et garde de bas de carte.

Le bouton or est un APLAT : on le detecte par sa couleur (R>150, R-B>60), ce qui ne
depend pas d'un seuil de lueur comme la detection par luminance de j2/29.

Controles :
  POSITIF — le rect doit etre IDENTIQUE au pixel en 1080x2400 et 1080x1920 (meme mise en
            page) : obtenu, x=[100..522] h=124 des deux cotes. L'ecart avec la mesure par
            LUMINANCE de j2 (x=[98..525]) est de 2-3 px par cote : c'est l'anneau de bord
            + anti-crenelage (sonde a y=1600 : x=98,99 a lum 100 = bord ; x>=100 a lum
            125..178 = aplat), pas un desaccord des deux instruments.
  NEGATIF — le meme detecteur applique au bouton SECONDAIRE (contour, pas d'aplat or)
            doit ne rien trouver : c'est la preuve qu'il detecte bien l'APLAT et pas un
            texte creme. Sans la condition de RUN (1re version), ce controle ECHOUAIT sur
            la reference ; ses chiffres ont ete jetes.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def est_or(p):
    return p[0] > 150 and (p[0] - p[2]) > 60


def rect_or(px, w, y0, y1, x0, x1, run_min=200):
    """APLAT or : on ne retient une rangee que si elle porte un RUN or continu de
    >= run_min px. 1re version sans cette condition : son controle negatif ECHOUAIT
    (le libelle creme « LAISSER EN L'ETAT » de la reference passait pour de l'or).
    Chiffres de cette 1re version jetes ; ceux-ci sont ceux du detecteur corrige."""
    xs, ys = [], []
    for y in range(y0, y1):
        run = 0
        best = 0
        a = b = None
        ba = bb = None
        for x in range(x0, x1):
            if est_or(px[x, y]):
                if run == 0:
                    a = x
                run += 1
                b = x
                if run > best:
                    best, ba, bb = run, a, b
            else:
                run = 0
        if best >= run_min:
            xs += [ba, bb]
            ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys))


JEUX = [
    ("REFERENCE cadre 5", os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), 1120, 1300, 1300, 1480, 1493),
    ("CAPTURE H01 2400", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x2400.png"), 1520, 1690, 1690, 1880, 1902),
    ("CAPTURE H01 1920", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x1920.png"), 1065, 1235, 1235, 1425, 1448),
]


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


for nom, path, yb0, yb1, yc0, yc1, y_bas_carte in JEUX:
    im = Image.open(path).convert("RGB")
    print(">>> %-20s ouvert %s %s" % (nom, os.path.basename(path)[:40], im.size))
    px = im.load()
    w, h = im.size
    r = rect_or(px, w, yb0, yb1, 40, 540)
    rn = rect_or(px, w, yb0, yb1, 545, 1045)
    print("    bouton PRIMAIRE (aplat or) x=[%d..%d] y=[%d..%d]  l=%d px = %.2f CSS  haut=%d px = %.2f CSS"
          % (r[0], r[2], r[1], r[3], r[2] - r[0] + 1, (r[2] - r[0] + 1) / ECH, r[3] - r[1] + 1, (r[3] - r[1] + 1) / ECH))
    print("    CONTROLE NEGATIF — meme detecteur sur le bouton SECONDAIRE : %s"
          % ("RIEN (attendu)" if rn is None else "x=[%d..%d] y=[%d..%d] (de l'or inattendu)" % (rn[0], rn[2], rn[1], rn[3])))
    # 1re ligne de consequence
    prem = None
    for y in range(yc0, yc1):
        if sum(1 for x in range(40, 1045) if lum(px[x, y]) > 95) >= 3:
            prem = y
            break
    der = None
    for y in range(yc1 - 1, yc0, -1):
        if sum(1 for x in range(40, 1045) if lum(px[x, y]) > 95) >= 3:
            der = y
            break
    print("    1re ligne de consequence y=%d   derniere y=%d" % (prem, der))
    print("    ECART bas du bouton or -> 1re ligne = %d px = %.2f CSS" % (prem - r[3], (prem - r[3]) / ECH))
    print("    GARDE bas : derniere ligne -> bord bas de la carte (y=%d) = %d px = %.2f CSS"
          % (y_bas_carte, y_bas_carte - der, (y_bas_carte - der) / ECH))
    print()
