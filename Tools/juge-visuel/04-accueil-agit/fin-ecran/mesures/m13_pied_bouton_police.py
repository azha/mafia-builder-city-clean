#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m13 — (a) aplat du bouton or ; (b) contraste des petits textes du PIED de carte, avec
des fenêtres recalées sur les crops ; (c) SÉRIF ou LINÉALE ? discriminateur objectif.

(c) Discriminateur : sur une ligne de texte, on relève la largeur d'encre LIGNE PAR LIGNE
(nombre de px d'encre par rangée). Une sérif pose des empattements : la rangée de la
LIGNE DE PIED porte nettement plus d'encre que le milieu de l'oeil. On rapporte
  R = (encre de la rangee de pied) / (encre mediane des rangees de l'oeil).
Contrôles internes à la MÊME image (donc même rendu, même anticrénelage) :
  - CAP « Aucune exception en attente » : DejaVu Sans, LINÉALE connue -> R bas
  - CAP « Des routes coupées » : titre sérif connu -> R haut
Si ces deux-là ne se séparent pas, le discriminateur ne discrimine pas et on le dit.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
REF = os.path.join(RACINE, "reference")
CAP = os.path.join(RACINE, "captures")
C7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
C5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
G02 = os.path.join(CAP, "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png")
H01 = os.path.join(CAP, "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def L(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def ratio(p, q):
    a, b = L(p), L(q)
    if a < b:
        a, b = b, a
    return (a + 0.05) / (b + 0.05)


def med3(ps):
    return tuple(sorted(p[i] for p in ps)[len(ps) // 2] for i in range(3))


def ouvre(c, cache={}):
    if c not in cache:
        im = Image.open(c).convert("RGB")
        cache[c] = im
        print("  [lu] %-46s %dx%d" % (os.path.basename(c), im.width, im.height))
    return cache[c]


def aplat(c, box, nom):
    px = ouvre(c).load()
    ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    m = med3(ps)
    print("      %-42s fenetre=%s -> %s" % (nom, box, m))
    return m


def contraste(c, box, nom, clair_sur_sombre=False):
    px = ouvre(c).load()
    ps = [px[x, y] for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(L(p) for p in ps)
    if clair_sur_sombre:
        fond = [p for p in ps if L(p) <= lums[int(0.60 * len(lums))]]
        enc = [p for p in ps if L(p) >= lums[int(0.94 * len(lums))]]
    else:
        fond = [p for p in ps if L(p) >= lums[int(0.40 * len(lums))]]
        enc = [p for p in ps if L(p) <= lums[int(0.06 * len(lums))]]
    mf, me = med3(fond), med3(enc)
    r = ratio(me, mf)
    print("      %-42s fond=%s encre=%s -> %5.2f:1  %s" % (nom, mf, me, r, "" if r >= 4.5 else "  << SOUS 4,5:1"))
    return r


def serif(c, box, nom, clair_sur_sombre=False):
    px = ouvre(c).load()
    ps = [(px[x, y], x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(L(p[0]) for p in ps)
    if clair_sur_sombre:
        seuil = (lums[int(0.50 * len(lums))] + lums[-1]) / 2
        test = lambda p: L(p) > seuil
    else:
        seuil = (lums[int(0.50 * len(lums))] + lums[0]) / 2
        test = lambda p: L(p) < seuil
    rangees = []
    for y in range(box[1], box[3]):
        n = sum(1 for x in range(box[0], box[2]) if test(px[x, y]))
        rangees.append((y, n))
    nz = [r for r in rangees if r[1] > 0]
    if len(nz) < 6:
        print("      %-42s trop peu d'encre" % nom); return None
    y0, y1 = nz[0][0], nz[-1][0]
    h = y1 - y0 + 1
    pied = [n for y, n in rangees if y1 - max(1, int(0.12 * h)) < y <= y1]
    oeil = [n for y, n in rangees if y0 + 0.30 * h <= y <= y0 + 0.70 * h]
    oeil_med = sorted(oeil)[len(oeil) // 2] if oeil else 1
    R = (max(pied) / float(oeil_med)) if oeil_med else 0
    print("      %-42s h_encre=%2d px | encre max au PIED=%4d | encre mediane a l'OEIL=%4d | R=%.2f"
          % (nom, h, max(pied), oeil_med, R))
    return R


print("=== (a) APLAT DU BOUTON OR ===")
g = aplat(C5, (160, 1148, 480, 1168), "REF cadre-5 bouton or (bande haute)")
h = aplat(H01, (160, 1584, 460, 1602), "CAP H01 bouton or (bande haute)")
print("      DELTA = (%+d, %+d, %+d)" % (h[0] - g[0], h[1] - g[1], h[2] - g[2]))

print("\n=== (b) PETITS TEXTES DU PIED DE CARTE (fenetres recalees) ===")
contraste(C7, (148, 1408, 262, 1434), "REF « PORTEE »")
contraste(G02, (134, 1768, 266, 1796), "CAP « PORTEE »")
contraste(C7, (136, 1484, 296, 1524), "REF « moderee »")
contraste(G02, (138, 1838, 266, 1872), "CAP « majeure »")
contraste(C7, (105, 845, 250, 875), "REF « TACTIQUE »")
contraste(G02, (152, 1084, 340, 1116), "CAP « TACTIQUE »")

print("\n=== (c) SERIF / LINEALE ===")
print("  --- controles internes a la capture ---")
r_sans = serif(H01, (355, 2056, 725, 2102), "[ctrl LINEALE] CAP « Aucune exception… »", True)
r_serif = serif(H01, (225, 1336, 855, 1400), "[ctrl SERIF] CAP titre « Des routes coupees »", True)
print("  --- les libelles du pied de carte ---")
serif(C7, (136, 1484, 296, 1524), "REF « moderee »")
serif(G02, (138, 1838, 266, 1872), "CAP « majeure »")
serif(C7, (148, 1408, 262, 1434), "REF « PORTEE »")
serif(G02, (134, 1768, 266, 1796), "CAP « PORTEE »")
serif(C7, (105, 845, 250, 875), "REF « TACTIQUE »")
serif(G02, (152, 1084, 340, 1116), "CAP « TACTIQUE »")
if r_sans and r_serif:
    print("  separation du discriminateur : lineale %.2f vs serif %.2f -> %s"
          % (r_sans, r_serif, "DISCRIMINE" if r_serif > r_sans * 1.25 else "NE DISCRIMINE PAS"))
