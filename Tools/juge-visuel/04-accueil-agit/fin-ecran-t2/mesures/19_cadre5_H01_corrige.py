#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""19 — CORRIGE 18. Trois fenetres de 18 etaient MORDUES (bloc de consequence coupe en haut,
colonne droite coupee a gauche) et deux bases etaient fausses (« majeure »/« pressante » ont un
jambage j/p que « moderee »/« faible » n'ont pas : la base lue etait le bas du jambage).

Ici : (a) blocs detectes sur TOUTE la largeur puis separes par le trou de colonnes ;
      (b) base de ligne prise sur le 'm' initial (ni jambage ni accent), isole par profil.

Contrôle POSITIF : le 'm' de « moderee » et celui de « majeure » doivent avoir la MEME hauteur
d'x dans la carte (mesure 11 : 18 px des deux cotes) — on refait la meme mesure ici, dans le
panneau sombre cette fois.
Contrôle NEGATIF : une bande de panneau sombre nu doit rendre « aucune encre ».
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def colonnes(path, nom, x0, x1, y0, y1, seuil=95, trou=25):
    """blocs separes par >= trou colonnes vides."""
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = {}
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1) if lum(px[x, y]) > seuil]
        if ys:
            cols[x] = (min(ys), max(ys))
    print("  %-34s [%s %s] fenetre x=[%d..%d] y=[%d..%d]" % (nom, os.path.basename(path)[:26], im.size, x0, x1, y0, y1))
    if not cols:
        print("      AUCUNE ENCRE")
        return []
    if min(cols) <= x0 or max(cols) >= x1 - 1:
        print("      !! FENETRE MORDUE EN X")
    bs = []
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
                if vide >= trou:
                    bs.append(cur)
                    cur = None
    if cur is not None:
        bs.append(cur)
    for i, b in enumerate(bs):
        mordu = "  !! MORDU EN Y" if (b[2] <= y0 or b[3] >= y1 - 1) else ""
        print("      bloc%d x=[%4d..%4d] l=%3d px (%6.2f CSS) centre_x=%6.1f   y=[%4d..%4d] h=%3d px (%6.2f CSS)%s" %
              (i, b[0], b[1], b[1] - b[0] + 1, (b[1] - b[0] + 1) / ECH, (b[0] + b[1]) / 2.0,
               b[2], b[3], b[3] - b[2] + 1, (b[3] - b[2] + 1) / ECH, mordu))
    return bs


def base_du_m(path, nom, x0, x1, y0, y1, seuil=95):
    """le 'm' initial d'un mot : premiere composante de colonnes, sans jambage ni accent."""
    im = Image.open(path)
    px = im.convert("RGB").load()
    cols = {}
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1) if lum(px[x, y]) > seuil]
        if ys:
            cols[x] = (min(ys), max(ys))
    if not cols:
        print("      %-32s AUCUNE ENCRE" % nom)
        return None
    xs = sorted(cols)
    fin = xs[0]
    for x in xs:
        if x - fin > 3:
            break
        fin = x
    deb = xs[0]
    haut = min(cols[x][0] for x in range(deb, fin + 1) if x in cols)
    bas = max(cols[x][1] for x in range(deb, fin + 1) if x in cols)
    print("      %-32s 'm' x=[%d..%d] l=%d px  y=[%d..%d]  hauteur d'x=%d px (%.2f CSS)  BASE=%d" %
          (nom, deb, fin, fin - deb + 1, haut, bas, bas - haut + 1, (bas - haut + 1) / ECH, bas))
    return bas


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01b = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> CONTROLE NEGATIF — panneau sombre nu")
colonnes(R5, "ref c5 panneau nu", 80, 1000, 790, 830)
colonnes(H01, "cap H01 panneau nu", 80, 1000, 1290, 1320)

print()
print(">>> BASES de la ligne PORTEE/URGENCE (le 'm' de moderee/majeure, sans jambage)")
print("  reference cadre 5 :")
base_du_m(R5, "valeur gauche 'moderee'", 365, 540, 995, 1045)
print("      label PORTEE : base lue en 18 = 1033 (capitales, sans jambage : fiable)")
print("  capture H01 :")
base_du_m(H01, "valeur gauche 'majeure'", 335, 500, 1420, 1480)
print("      label PORTEE : base lue en 18 = 1450 (capitales, sans jambage : fiable)")

print()
print(">>> CONSEQUENCES — blocs separes automatiquement sur toute la largeur")
colonnes(R5, "ref c5 consequences", 60, 1020, 1285, 1470, trou=35)
colonnes(H01, "cap H01 consequences", 60, 1020, 1770, 1975, trou=35)

print()
print(">>> BOUTONS — le contour du bouton SECONDAIRE (trait clair sur panneau sombre)")
colonnes(R5, "ref c5 rangee de boutons", 60, 1020, 1140, 1280, seuil=60, trou=20)
colonnes(H01, "cap H01 rangee de boutons", 60, 1020, 1570, 1710, seuil=60, trou=20)

print()
print(">>> TITRE — 'U'/'D' initial (capitale sans accent)")
colonnes(R5, "ref c5 titre ligne 1", 250, 830, 835, 905, trou=60)
colonnes(H01, "cap H01 titre", 200, 880, 1330, 1405, trou=60)

print()
print(">>> 'CE QU'ON PEUT FAIRE'")
colonnes(R5, "ref c5 CE QU'ON PEUT FAIRE", 60, 1020, 1070, 1110, trou=200)
colonnes(H01, "cap H01 CE QU'ON PEUT FAIRE", 60, 1020, 1500, 1545, trou=200)
