#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""20 — details de H01 / cadre 5 : hauteur de capitale du titre, blocs de consequence (fenetre
elargie — celle de 19 etait encore mordue en Y), panneau sombre (bbox), et rangee du bas.

Contrôle POSITIF : « CE QU'ON PEUT FAIRE » mesure 417 px (ref) et 412 px (capture) de large, meme
centre a 0,5 px — c'est la grandeur de reference qui prouve que l'echelle X est bien 1:1 ici aussi.
Contrôle NEGATIF : le detecteur de panneau sombre ne doit pas « voir » le ciel du decor (teste).
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def premier_glyphe(path, nom, x0, x1, y0, y1, seuil=95):
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = {}
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1) if lum(px[x, y]) > seuil]
        if ys:
            cols[x] = (min(ys), max(ys))
    if not cols:
        print("    %-36s AUCUNE ENCRE" % nom)
        return
    xs = sorted(cols)
    fin = xs[0]
    for x in xs:
        if x - fin > 3:
            break
        fin = x
    haut = min(cols[x][0] for x in range(xs[0], fin + 1) if x in cols)
    bas = max(cols[x][1] for x in range(xs[0], fin + 1) if x in cols)
    print("    %-36s x=[%d..%d] l=%d px (%.2f CSS)  y=[%d..%d] CAPITALE=%d px (%.2f CSS)   [%s %s]" %
          (nom, xs[0], fin, fin - xs[0] + 1, (fin - xs[0] + 1) / ECH, haut, bas, bas - haut + 1,
           (bas - haut + 1) / ECH, os.path.basename(path)[:24], im.size))


def bloc(path, nom, x0, x1, y0, y1, seuil=95):
    im = Image.open(path)
    px = im.convert("RGB").load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if lum(px[x, y]) > seuil:
                xs.append(x)
                ys.append(y)
    if not ys:
        print("    %-36s AUCUNE ENCRE" % nom)
        return
    mordu = "  !! MORDU" if (min(ys) <= y0 or max(ys) >= y1 - 1 or min(xs) <= x0 or max(xs) >= x1 - 1) else ""
    print("    %-36s x=[%4d..%4d] l=%3d (%6.2f CSS) centre=%6.1f   y=[%4d..%4d] h=%3d (%6.2f CSS)%s" %
          (nom, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
           (min(xs) + max(xs)) / 2.0, min(ys), max(ys), max(ys) - min(ys) + 1,
           (max(ys) - min(ys) + 1) / ECH, mordu))


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01b = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> TITRE — capitale initiale")
premier_glyphe(R5, "ref c5  'U' de « Un local a »", 370, 460, 840, 900)
premier_glyphe(H01, "cap H01 'D' de « Des routes »", 220, 320, 1335, 1405)

print()
print(">>> CONSEQUENCES — fenetre elargie (y: 1760..1990 capture / 1280..1480 ref)")
bloc(R5, "ref c5  consequence GAUCHE", 70, 545, 1280, 1480)
bloc(R5, "ref c5  consequence DROITE", 550, 1020, 1280, 1480)
bloc(H01, "cap H01 consequence GAUCHE", 70, 660, 1740, 1990)
bloc(H01, "cap H01 consequence DROITE", 665, 1020, 1740, 1990)

print()
print(">>> RAPPEL des boutons (19) : ref 100..525 / 554..979  |  capture 98..513 / 543..981")
print("    ref     : centres 312,5 et 766,5   largeurs 426 et 426 px")
print("    capture : centres 305,5 et 762,0   largeurs 416 et 439 px")

print()
print(">>> PANNEAU SOMBRE de la carte du jour — bbox par le BORD CLAIR du contour")


def panneau(path, nom, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    # le contour du panneau est un liseré plus clair que l'interieur ; on cherche, par ligne,
    # la 1re et la derniere colonne ou la luminance remonte de >= 8 par rapport a x=20 (hors panneau)
    lignes = []
    for y in range(y0, y1):
        ref = lum(px[12, y])
        xs = [x for x in range(30, 1050) if lum(px[x, y]) > ref + 6]
        if len(xs) > 300:
            lignes.append((y, min(xs), max(xs)))
    if not lignes:
        print("    %-30s rien" % nom)
        return
    print("    %-30s y=[%4d..%4d] h=%d px   x=[%4d..%4d] l=%d px (%.1f CSS)   [%s %s]" %
          (nom, lignes[0][0], lignes[-1][0], lignes[-1][0] - lignes[0][0] + 1,
           min(l[1] for l in lignes), max(l[2] for l in lignes),
           max(l[2] for l in lignes) - min(l[1] for l in lignes) + 1,
           (max(l[2] for l in lignes) - min(l[1] for l in lignes) + 1) / ECH,
           os.path.basename(path)[:24], im.size))


panneau(R5, "ref cadre 5", 740, 1500)
panneau(H01, "capture H01", 1260, 2000)

print()
print(">>> BANDEAU DU BAS — les 4 pastilles et leurs libelles (controle d'echelle commun)")
bloc(R5, "ref c5  libelles du bandeau", 100, 1000, 1990, 2050)
bloc(H01, "cap H01 libelles du bandeau", 100, 1000, 2300, 2350)
bloc(H01b, "cap H01 1920 libelles bandeau", 100, 1000, 1820, 1870)
