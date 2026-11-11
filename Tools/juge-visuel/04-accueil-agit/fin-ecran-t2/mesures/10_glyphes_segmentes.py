#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""10 — SEGMENTATION EN GLYPHES d'une ligne de texte : on decoupe la bande d'encre en colonnes
contigues separees par au moins GAP colonnes vides, puis on rend chaque glyphe (x0,x1,y0,y1).
C'est la seule facon de comparer une hauteur de capitale sans attraper le voisin — la mesure
« fenetre a la main » de 09 avait attrape 'm'+'o' dans « moderee ».

Contrôles :
  POSITIF — le NOMBRE de glyphes trouve doit etre celui du mot attendu (TACTIQUE = 8, PORTEE = 6).
            Si le compte ne tombe pas, la segmentation est fausse et ses hauteurs sont jetees.
  NEGATIF — une bande de papier vierge doit rendre 0 glyphe.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def glyphes(path, nom, x0, x1, y0, y1, seuil=165, gap=3, attendu=None):
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = {}
    for x in range(x0, x1):
        ys = []
        for y in range(y0, y1):
            r, g, b = px[x, y]
            if (0.299 * r + 0.587 * g + 0.114 * b) < seuil:
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
    print("  %-40s [%s %s] : %d glyphes%s" % (nom, os.path.basename(path)[:28], im.size, len(gs),
                                              ("  (attendu %d)" % attendu) if attendu else ""))
    if attendu is not None and len(gs) != attendu:
        print("      !! COMPTE FAUX -> mesures de cette ligne JETEES")
        return None
    for i, g in enumerate(gs):
        print("      g%-2d x=[%4d..%4d] l=%2d px (%.2f CSS)  y=[%4d..%4d] h=%2d px (%.2f CSS)" %
              (i, g[0], g[1], g[1] - g[0] + 1, (g[1] - g[0] + 1) / ECH, g[2], g[3],
               g[3] - g[2] + 1, (g[3] - g[2] + 1) / ECH))
    if gs:
        h = max(g[3] for g in gs) - min(g[2] for g in gs) + 1
        l = gs[-1][1] - gs[0][0] + 1
        print("      TOTAL l=%d px (%.2f CSS)  h=%d px (%.2f CSS)" % (l, l / ECH, h, h / ECH))
    return gs


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> TACTIQUE (8 lettres)")
glyphes(R7, "ref cadre 7  TACTIQUE", 120, 260, 890, 925, attendu=8)
glyphes(G05, "capture G05  TACTIQUE", 165, 330, 1150, 1190, attendu=8)

print()
print(">>> PORTEE (6 lettres, E accentue compris)")
glyphes(R7, "ref cadre 7  PORTEE", 150, 270, 1400, 1440, attendu=6)
glyphes(G05, "capture G05  PORTEE", 138, 275, 1725, 1765, attendu=6)

print()
print(">>> URGENCE (7 lettres)")
glyphes(R7, "ref cadre 7  URGENCE", 495, 660, 1400, 1440, attendu=7)
glyphes(G05, "capture G05  URGENCE", 520, 690, 1725, 1765, attendu=7)

print()
print(">>> valeur de bande : moderee (7) / majeure (7)")
glyphes(R7, "ref cadre 7  moderee", 130, 290, 1480, 1535, attendu=7)
glyphes(G05, "capture G05  majeure", 130, 290, 1795, 1850, attendu=7)

print()
print(">>> titre de la carte, ligne 1 : 'Des' (3 lettres, fenetre coupee apres)")
glyphes(R7, "ref cadre 7  Des", 200, 330, 1060, 1130, attendu=3)
glyphes(G05, "capture G05  Des", 230, 360, 1420, 1485, attendu=3)

print()
print(">>> CONTROLE NEGATIF — papier vierge")
glyphes(G05, "papier vierge G05", 300, 450, 1230, 1300)
