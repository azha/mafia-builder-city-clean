#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""23 — REMPLACE la partie « medaillon » et « filet du bandeau » de 22, dont l'erosion (rayon 4) a
RATE : elle a mange l'anneau dore (rondeur 0,409 cote reference, et cote capture elle a trouve le
petit losange, 14 px). Ici :
  - medaillon : on balaye la LIGNE horizontale qui passe par son centre et la COLONNE centrale,
    et on prend l'etendue de l'anneau dore ;
  - filet du bandeau : premiere ligne, sous y=100, ou >= 600 px sont plus clairs que le fond
    d'a cote (seuil relatif, pas absolu : le filet de la maquette est tres sombre).

Contrôle POSITIF : le centre du medaillon doit tomber au milieu de l'ecran (540) des deux cotes.
Contrôle NEGATIF : la meme recherche d'anneau 300 px plus bas (plein decor) ne doit rien rendre.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def est_or(p):
    r, g, b = p
    return r > 110 and b < 160 and (r - b) > 35


def balayage(path, nom, y, x0=380, x1=720):
    im = Image.open(path)
    px = im.convert("RGB").load()
    xs = [x for x in range(x0, x1) if est_or(px[x, y])]
    if not xs:
        print("    %-40s y=%3d : RIEN   [%s %s]" % (nom, y, os.path.basename(path)[:24], im.size))
        return None
    print("    %-40s y=%3d : or de x=%d a x=%d  diam=%d px (%.1f CSS)  centre=%.1f  (%d px dores)   [%s %s]" %
          (nom, y, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
           (min(xs) + max(xs)) / 2.0, len(xs), os.path.basename(path)[:24], im.size))
    return (min(xs), max(xs))


def colonne(path, nom, x, y0=0, y1=260):
    im = Image.open(path)
    px = im.convert("RGB").load()
    ys = [y for y in range(y0, y1) if est_or(px[x, y])]
    if not ys:
        print("    %-40s x=%3d : RIEN" % (nom, x))
        return None
    print("    %-40s x=%3d : or de y=%d a y=%d  h=%d px (%.1f CSS)" %
          (nom, x, min(ys), max(ys), max(ys) - min(ys) + 1, (max(ys) - min(ys) + 1) / ECH))
    return (min(ys), max(ys))


def filet_relatif(path, nom, y0, y1, n=600):
    im = Image.open(path)
    px = im.convert("RGB").load()
    for y in range(y0, y1):
        base = sorted([lum(px[x, y - 12]) for x in range(100, 300)])[100]
        xs = [x for x in range(5, 1075) if lum(px[x, y]) > base + 10 and est_or(px[x, y])]
        if len(xs) >= n:
            print("    %-30s filet y=%3d  x=[%4d..%4d] l=%3d px (%5.1f CSS)  couleur a x=200 : %s  fond 12px plus haut : %d" %
                  (nom, y, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
                   str(px[200, y]), int(base)))
            return
    print("    %-30s aucun filet dans y=[%d..%d]" % (nom, y0, y1))


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01b = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> CONTROLE NEGATIF — meme balayage 300 px plus bas (plein decor, pas de medaillon)")
balayage(R5, "ref c5  decor y=420", 420)
balayage(H01, "cap H01 decor y=420", 420)

print()
print(">>> MEDAILLON — balayage horizontal a plusieurs hauteurs")
for y in (60, 90, 110, 130, 150):
    balayage(R5, "ref cadre 5", y)
print()
for y in (50, 70, 90, 110, 130):
    balayage(H01, "capture H01", y)

print()
print(">>> MEDAILLON — colonne centrale")
colonne(R5, "ref cadre 5  colonne x=540", 540)
colonne(H01, "capture H01  colonne x=540", 540)

print()
print(">>> FILET DU BANDEAU (seuil RELATIF)")
filet_relatif(R5, "ref cadre 5", 115, 200)
filet_relatif(R6, "ref cadre 6", 115, 200)
filet_relatif(H01, "capture H01", 105, 200)
filet_relatif(G01, "capture G01", 105, 200)
filet_relatif(H01b, "capture H01 1920", 105, 200)
