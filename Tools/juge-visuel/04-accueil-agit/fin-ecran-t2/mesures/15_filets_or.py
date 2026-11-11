#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""15 — LES FILETS-OR (traits horizontaux qui encadrent « RETOUR A L'ACCUEIL »).
Un filet = une ligne ou >= 700 px sont plus CLAIRS que le vert du panneau. On rend son etendue x,
son epaisseur, et la couleur RESULTANTE au centre du trait (jamais un alpha lu ailleurs : la regle
sRGB/lineaire du socle impose de comparer le pixel rendu).

Contrôle POSITIF : le panneau vert mesure au MEME y, 40 px plus haut, doit NE PAS etre un filet.
Contrôle NEGATIF : dans la zone de la carte papier (tout est clair), le test doit etre desactive —
on ne cherche donc les filets que SOUS la carte.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def filets(path, nom, y0, y1, seuil_delta=25):
    im = Image.open(path)
    px = im.convert("RGB").load()
    w, h = im.size
    print("--- %s [%s %s] y=[%d..%d]" % (nom, os.path.basename(path)[:30], im.size, y0, y1))
    res = []
    for y in range(y0, y1):
        # fond vert de reference : mediane des 20 px les plus a gauche de la ligne
        fond = sorted([lum(px[x, y]) for x in range(5, 25)])[10]
        xs = [x for x in range(20, w - 20) if lum(px[x, y]) > fond + seuil_delta]
        if len(xs) >= 700:
            res.append((y, len(xs), min(xs), max(xs), px[(min(xs) + max(xs)) // 2, y], fond))
    if not res:
        print("    aucun filet")
        print()
        return
    # regrouper en traits contigus
    groupes = []
    cur = [res[0]]
    for r in res[1:]:
        if r[0] == cur[-1][0] + 1:
            cur.append(r)
        else:
            groupes.append(cur)
            cur = [r]
    groupes.append(cur)
    for g in groupes:
        y_a, y_b = g[0][0], g[-1][0]
        mid = g[len(g) // 2]
        print("    FILET y=[%4d..%4d]  epaisseur=%d px (%.2f CSS)  x=[%4d..%4d] l=%d px (%.1f CSS)  couleur au centre=%s  fond vert=%d" %
              (y_a, y_b, y_b - y_a + 1, (y_b - y_a + 1) / ECH, mid[2], mid[3], mid[3] - mid[2] + 1,
               (mid[3] - mid[2] + 1) / ECH, str(mid[4]), int(mid[5])))
    print()


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G03 = os.path.join(CAP, "G03_ApresGeste_deja_tranchee_c3aa3bbdb_b35bdd6cb_1080x2400.png")

filets(R6, "ref cadre 6  (sous la carte)", 1460, 1870)
filets(G01, "capture G01  (sous la carte)", 1800, 2200)
filets(R7, "ref cadre 7  (sous la carte)", 1580, 1870)
filets(G05, "capture G05  (sous la carte)", 1870, 2200)
filets(G03, "capture G03  (sous la carte)", 1970, 2200)
