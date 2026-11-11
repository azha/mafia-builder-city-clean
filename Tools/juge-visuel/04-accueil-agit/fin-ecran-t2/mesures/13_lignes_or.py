#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""13 — textes clairs sur vert, mesures par ETENDUE DE LIGNE (la segmentation en glyphes de 12
echoue sur ces capitales tres espacees : un R se coupe en deux). On mesure ici :
  - l'etendue verticale de l'encre claire d'une BANDE (= hauteur de capitale si la bande ne contient
    que des capitales sans accent ni jambage) ;
  - l'etendue horizontale de la ligne entiere (largeur du bloc de texte).
Le choix des fenetres est imprime pour qu'on puisse verifier qu'elles ne mordent sur rien d'autre.

Contrôles :
  POSITIF — la MEME grandeur mesuree sur la capture 2400 et la capture 1920 doit coincider.
  NEGATIF — deux fenetres posees sur du vert VRAIMENT nu (marge gauche du panneau, entre la carte
            et le bord) doivent rendre « aucune encre ». (Les fenetres « vert nu » de 12 etaient
            mal posees : elles tombaient sur le mot-or — contrôle refait ici.)
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
SEUIL = 120


def bande(path, nom, x0, x1, y0, y1, seuil=SEUIL):
    im = Image.open(path)
    px = im.convert("RGB").load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y]
            if (0.299 * r + 0.587 * g + 0.114 * b) > seuil:
                xs.append(x)
                ys.append(y)
    if not ys:
        print("  %-38s AUCUNE ENCRE CLAIRE dans (%d,%d)-(%d,%d)   [%s]" %
              (nom, x0, y0, x1, y1, os.path.basename(path)[:26]))
        return None
    h = max(ys) - min(ys) + 1
    l = max(xs) - min(xs) + 1
    touche = (min(ys) <= y0) or (max(ys) >= y1 - 1) or (min(xs) <= x0) or (max(xs) >= x1 - 1)
    print("  %-38s y=[%4d..%4d] h=%2d px (%5.2f CSS)   x=[%4d..%4d] l=%3d px (%6.2f CSS)%s   [%s %s]" %
          (nom, min(ys), max(ys), h, h / ECH, min(xs), max(xs), l, l / ECH,
           "  !! FENETRE MORDUE" if touche else "", os.path.basename(path)[:26], im.size))
    return (min(xs), min(ys), max(xs), max(ys))


R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G01b = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x1920.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G06 = os.path.join(CAP, "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — vert vraiment nu (marge gauche du panneau, hors carte)")
bande(R6, "ref cadre 6  marge gauche", 10, 60, 1000, 1100)
bande(G01, "capture G01  marge gauche", 10, 60, 1350, 1450)

print()
print(">>> GRAVE — la ligne entiere, et la portion 'VOUS'/'LA' (capitales sans accent)")
bande(R6, "ref cadre 6  grave ENTIER", 60, 1020, 565, 635)
bande(G01, "capture G01  grave ENTIER", 60, 1020, 950, 1020)
bande(R6, "ref cadre 6  'VOUS'", 232, 400, 565, 635)
bande(G01, "capture G01  'VOUS'", 246, 414, 950, 1020)
bande(R7, "ref cadre 7  grave ENTIER", 60, 1020, 695, 765)
bande(G05, "capture G05  grave ENTIER", 60, 1020, 1015, 1085)

print()
print(">>> LIGNE-OR 'RETOUR A L'ACCUEIL' — ligne entiere")
bande(R6, "ref cadre 6  RETOUR..ACCUEIL", 60, 1020, 1680, 1750)
bande(G01, "capture G01  RETOUR..ACCUEIL", 60, 1020, 2020, 2090)
bande(G01b, "capture G01 1920 RETOUR..", 60, 1020, 1540, 1610)

print()
print(">>> SOUS-LIGNE (gris) — « Rien d'autre a trancher pour l'instant. »")
bande(R6, "ref cadre 6  sous-ligne", 60, 1020, 1755, 1810)
bande(G01, "capture G01  sous-ligne", 60, 1020, 2095, 2150)

print()
print(">>> LIBRE / PRIS")
bande(R6, "ref cadre 6  LIBRE", 790, 960, 1320, 1360)
bande(G01, "capture G01  LIBRE", 790, 960, 1730, 1775)
bande(G06, "capture G06  PRIS", 790, 960, 1825, 1870)

print()
print(">>> « votre grande decision du jour » (2 lignes, gris)")
bande(R6, "ref cadre 6  petit texte jeton", 740, 1010, 1365, 1430)
bande(G01, "capture G01  petit texte jeton", 740, 1010, 1780, 1845)
