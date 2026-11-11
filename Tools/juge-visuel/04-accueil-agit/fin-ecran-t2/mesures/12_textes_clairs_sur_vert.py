#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""12 — textes CLAIRS sur fond VERT (grave, mot-or, ligne-or, sous-ligne, LIBRE/PRIS).

!! Les lignes « grave » et « RETOUR » de 09_hauteurs_de_capitale.py sont INVALIDES : elles
utilisaient un seuil d'encre SOMBRE (L < 165) sur un panneau vert dont la luminance vaut ~50 —
le fond entier passait pour de l'encre (les fenetres rendaient l=46 px sur 46 px demandes).
Ici : encre = L > SEUIL_CLAIR, avec segmentation en glyphes et contrôle du COMPTE.

Contrôles :
  POSITIF — le compte de glyphes du mot doit tomber juste (VOUS = 4, RETOUR = 6, LIBRE = 5).
  NEGATIF — une fenetre sur du vert nu doit rendre 0 glyphe.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
SEUIL = 120


def glyphes(path, nom, x0, x1, y0, y1, gap=3, attendu=None, seuil=SEUIL):
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = {}
    for x in range(x0, x1):
        ys = []
        for y in range(y0, y1):
            r, g, b = px[x, y]
            if (0.299 * r + 0.587 * g + 0.114 * b) > seuil:
                ys.append(y)
        if ys:
            cols[x] = (min(ys), max(ys))
    gs = []
    cur = None
    vide = 0
    for x in range(x0, x1):
        if x in cols:
            if cur is None:
                cur = [x, x, cols[x][0], cols[x][1]]
            else:
                cur[1] = x
                cur[2] = min(cur[2], cols[x][0])
                cur[3] = max(cur[3], cols[x][1])
            vide = 0
        else:
            if cur is not None:
                vide += 1
                if vide >= gap:
                    gs.append(cur)
                    cur = None
    if cur is not None:
        gs.append(cur)
    ok = (attendu is None) or (len(gs) == attendu)
    print("  %-36s [%s %s] : %d glyphes%s%s" %
          (nom, os.path.basename(path)[:26], im.size, len(gs),
           ("  (attendu %d)" % attendu) if attendu else "",
           "" if ok else "   !! COMPTE FAUX -> JETE"))
    if not ok:
        return None
    for i, g in enumerate(gs[:4]):
        print("      g%-2d x=[%4d..%4d] l=%2d px  y=[%4d..%4d] h=%2d px = %5.2f CSS" %
              (i, g[0], g[1], g[1] - g[0] + 1, g[2], g[3], g[3] - g[2] + 1, (g[3] - g[2] + 1) / ECH))
    if gs:
        l = gs[-1][1] - gs[0][0] + 1
        h = max(g[3] for g in gs) - min(g[2] for g in gs) + 1
        print("      MOT l=%d px (%.2f CSS)  h=%d px (%.2f CSS)  premier glyphe h=%d px (%.2f CSS)" %
              (l, l / ECH, h, h / ECH, gs[0][3] - gs[0][2] + 1, (gs[0][3] - gs[0][2] + 1) / ECH))
    return gs


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G06 = os.path.join(CAP, "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> GRAVE — 'VOUS' (4 lettres) de « VOUS AVEZ TRANCHE »")
glyphes(R6, "ref cadre 6  VOUS", 230, 420, 570, 630, attendu=4)
glyphes(G01, "capture G01  VOUS", 240, 440, 955, 1015, attendu=4)

print()
print(">>> GRAVE — 'LA' (2 lettres) de « LA CARTE RESTE SUR LA TABLE »")
glyphes(R7, "ref cadre 7  LA", 100, 200, 700, 760, attendu=2)
glyphes(G05, "capture G05  LA", 125, 230, 1020, 1080, attendu=2)

print()
print(">>> 'RETOUR' (6 lettres) de la ligne-or")
glyphes(R6, "ref cadre 6  RETOUR", 305, 530, 1680, 1750, attendu=6)
glyphes(G01, "capture G01  RETOUR", 310, 540, 2020, 2090, attendu=6)

print()
print(">>> 'LIBRE' / 'PRIS' sous le jeton")
glyphes(R6, "ref cadre 6  LIBRE", 780, 960, 1320, 1370, attendu=5)
glyphes(G01, "capture G01  LIBRE", 780, 960, 1735, 1785, attendu=5)
glyphes(G06, "capture G06  PRIS", 780, 960, 1830, 1880, attendu=4)

print()
print(">>> CONTROLE NEGATIF — vert nu")
glyphes(R6, "ref cadre 6 vert nu", 60, 200, 1500, 1560)
glyphes(G01, "capture G01 vert nu", 60, 200, 1900, 1960)
