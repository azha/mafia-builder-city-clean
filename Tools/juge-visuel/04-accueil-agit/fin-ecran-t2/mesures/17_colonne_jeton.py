#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""17 — la COLONNE DU JETON : disque, mot d'etat (LIBRE/PRIS), petit texte « votre grande decision
du jour ». On delimite chaque bloc par le profil de lignes (encre claire sur vert), puis on rend
sa bbox, sa hauteur de capitale et sa couleur de coeur.

Contrôle POSITIF : le disque mesure ici doit retomber sur le diametre de 05 (151 px ref / 150 px
capture) — deux instruments independants sur la meme grandeur.
Contrôle NEGATIF : la bande de vert entre le disque et le mot d'etat doit rendre un bloc VIDE.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def blocs(path, nom, y0, y1, x0=740, x1=1020, seuil=95):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("--- %s [%s %s] colonne x=[%d..%d]" % (nom, os.path.basename(path)[:30], im.size, x0, x1))
    lignes = []
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if lum(px[x, y]) > seuil]
        lignes.append((y, xs))
    bs = []
    cur = None
    for y, xs in lignes:
        if xs:
            if cur is None:
                cur = [y, y, min(xs), max(xs)]
            else:
                cur[1] = y
                cur[2] = min(cur[2], min(xs))
                cur[3] = max(cur[3], max(xs))
        else:
            if cur is not None and cur[1] - cur[0] >= 2:
                bs.append(cur)
            cur = None
    if cur is not None and cur[1] - cur[0] >= 2:
        bs.append(cur)
    prev_bas = None
    for b in bs:
        ecart = ("  ecart au bloc precedent = %d px (%.2f CSS)" % (b[0] - prev_bas - 1, (b[0] - prev_bas - 1) / ECH)) if prev_bas else ""
        # couleur de coeur : mediane du decile le plus clair
        pts = sorted([px[x, y] for y in range(b[0], b[1] + 1) for x in range(b[2], b[3] + 1)], key=lum)
        d = max(1, len(pts) // 10)
        coeur = tuple(sorted(c[i] for c in pts[-d:])[d // 2] for i in range(3))
        print("    bloc y=[%4d..%4d] h=%3d px (%6.2f CSS)  x=[%4d..%4d] l=%3d px (%6.2f CSS)  coeur=%s%s" %
              (b[0], b[1], b[1] - b[0] + 1, (b[1] - b[0] + 1) / ECH, b[2], b[3], b[3] - b[2] + 1,
               (b[3] - b[2] + 1) / ECH, str(coeur), ecart))
        prev_bas = b[1]
    print()


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G06 = os.path.join(CAP, "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png")

blocs(R6, "ref cadre 6", 1120, 1440)
blocs(G01, "capture G01", 1540, 1860)
blocs(G06, "capture G06", 1635, 1955)
