#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""18 — AVANT LE GESTE : cadre 5 (reference) contre H01 (capture).
On mesure : le panneau sombre, les deux boutons, la ligne PORTEE/URGENCE (alignement des bases),
les deux blocs de consequence (largeur et centre, par rapport au bouton qu'ils expliquent).

Reperes : X est 1:1 (prouve par le jeton de 05/17 : disque 151x152 px a x=[806..957] des deux
cotes) ; toute grandeur est donnee en px et en px CSS (/3,6).

Contrôles :
  POSITIF — la largeur d'ecran (1080) et la position des quatre pastilles du bandeau bas doivent
            coincider ; on la mesure.
  NEGATIF — le detecteur de « bouton dore » ne doit RIEN trouver dans la moitie haute de l'ecran
            (le decor 3D n'est pas un bouton).
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def est_bouton_dore(p):
    r, g, b = p
    return r > 190 and 150 < g < 225 and b < 140 and (r - b) > 80


def bbox_pred(im, pred, x0, x1, y0, y1, minrun=40):
    px = im.convert("RGB").load()
    lignes = []
    for y in range(y0, y1):
        n = 0
        a = b = -1
        cur = 0
        deb = -1
        for x in range(x0, x1):
            if pred(px[x, y]):
                if cur == 0:
                    deb = x
                cur += 1
                if cur > n:
                    n, a, b = cur, deb, x
            else:
                cur = 0
        if n >= minrun:
            lignes.append((y, a, b))
    if not lignes:
        return None
    return (min(l[1] for l in lignes), lignes[0][0], max(l[2] for l in lignes), lignes[-1][0])


def ligne_encre(im, nom, x0, x1, y0, y1, clair=True, seuil=120):
    px = im.convert("RGB").load()
    xs, ys = [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            L = lum(px[x, y])
            if (L > seuil) if clair else (L < seuil):
                xs.append(x)
                ys.append(y)
    if not ys:
        print("    %-40s AUCUNE ENCRE" % nom)
        return None
    print("    %-40s x=[%4d..%4d] l=%3d px (%6.2f CSS)  y=[%4d..%4d] h=%2d px (%5.2f CSS)  base=%d  centre_x=%.1f" %
          (nom, min(xs), max(xs), max(xs) - min(xs) + 1, (max(xs) - min(xs) + 1) / ECH,
           min(ys), max(ys), max(ys) - min(ys) + 1, (max(ys) - min(ys) + 1) / ECH,
           max(ys), (min(xs) + max(xs)) / 2.0))
    return (min(xs), min(ys), max(xs), max(ys))


R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x2400.png")
H01b = os.path.join(CAP, "H01_AccueilTete_Cadre5_c3aa3bbdb_b35bdd6cb_1080x1920.png")

print(">>> CONTROLE NEGATIF — bouton dore cherche dans la moitie HAUTE (decor seul)")
for p in (R5, H01):
    im = Image.open(p)
    b = bbox_pred(im, est_bouton_dore, 0, 1080, 0, im.size[1] // 3)
    print("    %-34s %s -> %s" % (os.path.basename(p)[:30], im.size, "RIEN (ok)" if b is None else "TROUVE %s !!" % str(b)))

print()
print(">>> BOUTON PRIMAIRE (aplat dore)")
for p, (yy0, yy1) in ((R5, (1050, 1300)), (H01, (1550, 1800))):
    im = Image.open(p)
    b = bbox_pred(im, est_bouton_dore, 0, 1080, yy0, yy1, minrun=100)
    print("    %-34s %s  bbox=%s  l=%d px (%.1f CSS)  h=%d px (%.1f CSS)" %
          (os.path.basename(p)[:30], im.size, str(b), b[2] - b[0] + 1, (b[2] - b[0] + 1) / ECH,
           b[3] - b[1] + 1, (b[3] - b[1] + 1) / ECH))

print()
print(">>> LIGNE 'PORTEE <valeur>   URGENCE <valeur>' — bases comparees")
im = Image.open(R5)
print("  --- reference cadre 5 %s" % str(im.size))
ligne_encre(im, "PORTEE (label)", 215, 360, 990, 1035)
ligne_encre(im, "valeur (moderee)", 365, 540, 985, 1045)
ligne_encre(im, "URGENCE (label)", 570, 745, 990, 1035)
ligne_encre(im, "valeur (faible)", 750, 880, 985, 1045)
im = Image.open(H01)
print("  --- capture H01 %s" % str(im.size))
ligne_encre(im, "PORTEE (label)", 185, 335, 1415, 1460)
ligne_encre(im, "valeur (majeure)", 340, 500, 1410, 1475)
ligne_encre(im, "URGENCE (label)", 535, 710, 1415, 1460)
ligne_encre(im, "valeur (pressante)", 715, 900, 1410, 1475)

print()
print(">>> CONSEQUENCES sous les boutons — largeur et centre de chaque colonne")
im = Image.open(R5)
print("  --- reference cadre 5")
ligne_encre(im, "consequence GAUCHE", 60, 540, 1300, 1460, seuil=95)
ligne_encre(im, "consequence DROITE", 545, 1020, 1300, 1460, seuil=95)
im = Image.open(H01)
print("  --- capture H01")
ligne_encre(im, "consequence GAUCHE", 60, 680, 1800, 1960, seuil=95)
ligne_encre(im, "consequence DROITE", 685, 1020, 1800, 1960, seuil=95)

print()
print(">>> TITRE DE LA CARTE DU JOUR (or, sur le panneau sombre)")
im = Image.open(R5)
ligne_encre(im, "ref cadre 5 titre (2 lignes)", 60, 1020, 820, 960)
im = Image.open(H01)
ligne_encre(im, "cap H01 titre (1 ligne)", 60, 1020, 1330, 1410)

print()
print(">>> LIBELLES DES BOUTONS — hauteur de capitale")
im = Image.open(R5)
ligne_encre(im, "ref c5 libelle bouton GAUCHE", 150, 490, 1160, 1250, clair=False, seuil=90)
ligne_encre(im, "ref c5 libelle bouton DROIT", 600, 940, 1160, 1250)
im = Image.open(H01)
ligne_encre(im, "cap H01 libelle bouton GAUCHE", 150, 490, 1660, 1750, clair=False, seuil=90)
ligne_encre(im, "cap H01 libelle bouton DROIT", 570, 990, 1660, 1750)
