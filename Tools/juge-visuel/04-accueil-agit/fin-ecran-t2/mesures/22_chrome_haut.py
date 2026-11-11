#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""22 — LE CHROME DU HAUT (bandeau ARGENT / medaillon de chaleur / JOUR), commun aux 7 etats.
On mesure : le filet-or sous le bandeau (y, etendue, couleur), le medaillon (anneau dore : bbox et
RONDEUR par erosion, comme le jeton), et les deux blocs de texte lateraux.

Contrôles :
  POSITIF — la rondeur du medaillon doit valoir ~1,00 des deux cotes (c'est un disque).
  NEGATIF — l'erosion appliquee au bas de l'ecran (bandeau d'onglets, pas de medaillon) ne doit
            rendre aucun disque.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
R = 4


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def est_or(p):
    r, g, b = p
    return r > 120 and b < 150 and (r - b) > 40


def disque(path, nom, x0, x1, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    brut = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if est_or(px[x, y]):
                brut.add((x, y))
    ero = set()
    for (x, y) in brut:
        ok = True
        for dy in range(-R, R + 1):
            if not ok:
                break
            for dx in range(-R, R + 1):
                if dx * dx + dy * dy <= R * R and (x + dx, y + dy) not in brut:
                    ok = False
                    break
        if ok:
            ero.add((x, y))
    if not ero:
        print("    %-34s aucun disque (0 px apres erosion)   [%s %s]" % (nom, os.path.basename(path)[:24], im.size))
        return
    xs = [p[0] for p in ero]
    ys = [p[1] for p in ero]
    dx = max(xs) - min(xs) + 1 + 2 * R
    dy = max(ys) - min(ys) + 1 + 2 * R
    print("    %-34s anneau x=[%d..%d] y=[%d..%d]  diam_x=%d px (%.1f CSS) diam_y=%d  RONDEUR=%.3f  centre_x=%.1f   [%s %s]" %
          (nom, min(xs) - R, max(xs) + R, min(ys) - R, max(ys) + R, dx, dx / ECH, dy, dx / float(dy),
           (min(xs) + max(xs)) / 2.0, os.path.basename(path)[:24], im.size))


def filet(path, nom, y0, y1):
    im = Image.open(path)
    px = im.convert("RGB").load()
    for y in range(y0, y1):
        xs = [x for x in range(5, 1075) if est_or(px[x, y]) and lum(px[x, y]) > 55]
        if len(xs) > 700:
            print("    %-34s filet y=%d  x=[%d..%d] l=%d px (%.1f CSS)  couleur=%s   [%s %s]" %
                  (nom, y, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
                   str(px[200, y]), os.path.basename(path)[:24], im.size))
            return
    print("    %-34s aucun filet dans y=[%d..%d]" % (nom, y0, y1))


def bloc(path, nom, x0, x1, y0, y1, seuil=90):
    im = Image.open(path)
    px = im.convert("RGB").load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if lum(px[x, y]) > seuil:
                xs.append(x)
                ys.append(y)
    if not ys:
        print("    %-34s aucune encre" % nom)
        return
    print("    %-34s x=[%4d..%4d] l=%3d px (%6.2f CSS)  y=[%3d..%3d] h=%2d px (%5.2f CSS)" %
          (nom, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
           min(ys), max(ys), max(ys) - min(ys) + 1, (max(ys) - min(ys) + 1) / ECH))


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
G01 = os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png")

print(">>> CONTROLE NEGATIF — erosion au bas de l'ecran (onglets, pas de medaillon)")
disque(R5, "ref c5  bas d'ecran", 100, 980, 1900, 2000)
disque(H01, "cap H01 bas d'ecran", 100, 980, 2180, 2290)

print()
print(">>> MEDAILLON DE CHALEUR")
disque(R5, "ref cadre 5  medaillon", 400, 700, 10, 220)
disque(R6, "ref cadre 6  medaillon", 400, 700, 10, 220)
disque(H01, "capture H01  medaillon", 350, 740, 10, 200)
disque(G01, "capture G01  medaillon", 350, 740, 10, 200)

print()
print(">>> FILET SOUS LE BANDEAU")
filet(R5, "ref cadre 5", 100, 180)
filet(H01, "capture H01", 90, 180)

print()
print(">>> BLOCS DE TEXTE DU BANDEAU")
bloc(R5, "ref c5  ARGENT + somme", 20, 320, 25, 115)
bloc(H01, "cap H01 ARGENT + somme", 20, 320, 15, 110)
bloc(R5, "ref c5  JOUR + moment", 740, 1070, 25, 115)
bloc(H01, "cap H01 JOUR + moment", 740, 1070, 15, 110)
