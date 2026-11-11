#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""09 — HAUTEUR DE CAPITALE (ce que l'oeil voit), mesuree sur UN glyphe choisi, sans accent ni
jambage : on donne une fenetre (x0,x1,y0,y1) qui ne contient que ce glyphe et on rend l'etendue
verticale de son encre. Le resultat est ramene en px CSS (/3,6).

Contrôles :
  POSITIF — le meme mot mesure dans deux captures de resolutions differentes (2400 et 1920) doit
            donner la MEME hauteur de capitale : l'art est natif, pas mis a l'echelle.
  NEGATIF — une fenetre posee sur du papier VIERGE doit rendre « aucune encre ».
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def capitale(path, nom, x0, x1, y0, y1, seuil=165, sombre=True):
    im = Image.open(path)
    px = im.convert("RGB").load()
    ys = []
    xs = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            L = 0.299 * r + 0.587 * g + 0.114 * b
            enc = (L < seuil) if sombre else (L > seuil)
            if enc:
                ys.append(y)
                xs.append(x)
    if not ys:
        print("    %-34s  AUCUNE ENCRE dans la fenetre (%d,%d)-(%d,%d)" % (nom, x0, y0, x1, y1))
        return None
    h = max(ys) - min(ys) + 1
    print("    %-34s  y=[%d..%d]  hauteur=%2d px = %5.2f CSS   x=[%d..%d] (l=%d px = %.2f CSS)   [%s %s]" %
          (nom, min(ys), max(ys), h, h / ECH, min(xs), max(xs), max(xs) - min(xs) + 1,
           (max(xs) - min(xs) + 1) / ECH, os.path.basename(path), im.size))
    return h


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G01b = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x1920.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> TITRE DE LA CARTE — le 'D' de 'Des ...' (pas d'accent, pas de jambage)")
capitale(R7, "ref cadre 7  'D' de Des locaux", 209, 262, 1060, 1130)
capitale(G05, "capture G05  'D' de Des routes", 238, 291, 1420, 1480)
capitale(G01, "capture G01  'D' de Des routes", 236, 289, 1355, 1420)

print()
print(">>> 'TACTIQUE' — hauteur de capitale (tout en capitales, sans accent)")
capitale(R7, "ref cadre 7  TACTIQUE", 125, 245, 890, 925)
capitale(G05, "capture G05 TACTIQUE", 160, 320, 1150, 1205)

print()
print(">>> LOSANGE au-dessus / a cote de TACTIQUE")
capitale(R7, "ref cadre 7  losange", 160, 200, 845, 895)
capitale(G05, "capture G05 losange", 118, 150, 1150, 1205)

print()
print(">>> 'PORTEE' (petites capitales espacees) — hauteur de capitale")
capitale(R7, "ref cadre 7  PORTEE", 155, 300, 1398, 1436)
capitale(G05, "capture G05 PORTEE", 136, 290, 1716, 1756)

print()
print(">>> valeur de bande 'moderee' / 'majeure' — le 'm' (hauteur d'x, serif)")
capitale(R7, "ref cadre 7  'm' de moderee", 139, 190, 1480, 1530)
capitale(G05, "capture G05 'm' de majeure", 136, 190, 1795, 1850)

print()
print(">>> GRAVE (titre du panneau) — 'V' de VOUS / 'L' de LA CARTE")
capitale(R6, "ref cadre 6  'V' de VOUS", 239, 285, 580, 625)
capitale(G01, "capture G01 'V' de VOUS", 253, 299, 965, 1005)
capitale(R7, "ref cadre 7  'L' de LA CARTE", 104, 145, 710, 750)
capitale(G05, "capture G05 'L' de LA CARTE", 132, 172, 1030, 1070)

print()
print(">>> 'RETOUR A L'ACCUEIL' — le 'R'")
capitale(R6, "ref cadre 6  'R' de RETOUR", 311, 355, 1690, 1740)
capitale(G01, "capture G01 'R' de RETOUR", 317, 361, 2030, 2075)

print()
print(">>> CONTROLE POSITIF — meme grandeur en 2400 et en 1920")
capitale(G01b, "capture G01 1920 'D' de Des", 236, 289, 875, 940)
capitale(G01b, "capture G01 1920 'R' de RETOUR", 317, 361, 1550, 1595)

print()
print(">>> CONTROLE NEGATIF — fenetre sur du papier vierge (milieu haut de la carte G05)")
capitale(G05, "papier vierge G05", 300, 450, 1230, 1300)
capitale(R7, "papier vierge cadre 7", 300, 450, 950, 1030)
