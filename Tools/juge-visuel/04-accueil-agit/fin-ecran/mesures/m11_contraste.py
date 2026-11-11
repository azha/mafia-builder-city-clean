#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m11 — contraste texte/fond SUR L'ART RÉEL (WCAG), et hauteur de capitale.

Méthode : dans une fenêtre généreuse, on sépare encre et fond par la luminance. Le fond
est la médiane des pixels du côté majoritaire ; l'encre est la médiane du coeur de trait
(les 6 % de pixels les plus éloignés du fond, ce qui évite la frange d'anti-crénelage).
Le rapport WCAG se calcule sur les deux couleurs médianes. La bbox de l'encre et la
hauteur de capitale (plus grande hauteur d'une composante connexe d'encre) sont données
pour que la fenêtre se vérifie.

Contrôle positif : « Aube » (blanc pur sur bandeau quasi noir) doit sortir > 12:1 ;
Contrôle négatif : une fenêtre de feutre vert UNI (sans texte) doit sortir ~1,0:1 —
un instrument qui trouve du contraste dans un aplat ne mesure pas du texte.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6
CAP = os.path.join(RACINE, "captures")
REF = os.path.join(RACINE, "reference")


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def L(p):
    return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2])


def ratio(a, b):
    la, lb = L(a), L(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


def med(ps):
    if not ps:
        return (0, 0, 0)
    return tuple(sorted(p[i] for p in ps)[len(ps) // 2] for i in range(3))


def mesure(chemin, box, nom, sombre_sur_clair=None):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    pts = [(px[x, y], x, y) for y in range(box[1], box[3]) for x in range(box[0], box[2])]
    lums = sorted(L(p[0]) for p in pts)
    lo, hi = lums[int(0.02 * len(lums))], lums[int(0.98 * len(lums))]
    # le fond est le mode : on regarde de quel cote est la masse
    milieu = (lo + hi) / 2
    nb_bas = sum(1 for v in lums if v < milieu)
    fond_bas = nb_bas > len(lums) / 2
    if sombre_sur_clair is not None:
        fond_bas = not sombre_sur_clair
    if fond_bas:
        fond_ps = [p for p, x, y in pts if L(p) <= lums[int(0.60 * len(lums))]]
        encre_ps = [p for p, x, y in pts if L(p) >= lums[int(0.94 * len(lums))]]
        encre_pts = [(x, y) for p, x, y in pts if L(p) >= lums[int(0.94 * len(lums))]]
    else:
        fond_ps = [p for p, x, y in pts if L(p) >= lums[int(0.40 * len(lums))]]
        encre_ps = [p for p, x, y in pts if L(p) <= lums[int(0.06 * len(lums))]]
        encre_pts = [(x, y) for p, x, y in pts if L(p) <= lums[int(0.06 * len(lums))]]
    f, e = med(fond_ps), med(encre_ps)
    if encre_pts:
        bx0 = min(p[0] for p in encre_pts); bx1 = max(p[0] for p in encre_pts)
        by0 = min(p[1] for p in encre_pts); by1 = max(p[1] for p in encre_pts)
        haut = by1 - by0 + 1
    else:
        bx0 = bx1 = by0 = by1 = haut = 0
    r = ratio(e, f)
    print("  %-44s %-30s %dx%d" % (nom, os.path.basename(chemin)[:30], im.width, im.height))
    print("      fenetre=%s | fond=%s encre=%s | CONTRASTE = %5.2f:1 | encre bbox=(%d,%d,%d,%d) h=%d px = %.1f CSS"
          % (box, f, e, r, bx0, by0, bx1, by1, haut, haut / CSS))
    return r


print("=== CONTROLES ===")
mesure(os.path.join(CAP, "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), (930, 66, 1040, 104),
       "[+] « Aube » blanc sur bandeau noir", sombre_sur_clair=False)
mesure(os.path.join(CAP, "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), (820, 1950, 1000, 2010),
       "[-] feutre vert UNI (aucun texte)", sombre_sur_clair=False)

print("\n=== CAPTURE G01 (apres-geste executed) ===")
F = os.path.join(CAP, "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png")
mesure(F, (200, 960, 880, 1015), "grave « VOUS AVEZ TRANCHE » or/vert", False)
mesure(F, (100, 1845, 980, 1955), "mot-or « Les chantiers des 2 routes… »", False)
mesure(F, (230, 2030, 850, 2070), "ligne-or « RETOUR A L'ACCUEIL »", False)
mesure(F, (230, 2075, 850, 2110), "sous-ligne « Rien d'autre a trancher… »", False)
mesure(F, (830, 1725, 940, 1755), "jeton « LIBRE »", False)
mesure(F, (780, 1755, 990, 1810), "jeton « votre grande decision du jour »", False)
mesure(F, (155, 1090, 345, 1120), "carte « TACTIQUE » rouge/creme", True)
mesure(F, (130, 1670, 260, 1700), "carte « PORTEE »", True)
mesure(F, (135, 1710, 260, 1745), "carte « majeure »", True)
mesure(F, (195, 2320, 325, 2350), "nav « EMPIRE »", False)

print("\n=== CAPTURE G05 (echec 1re cible : mot rouge) ===")
F5 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_cb56d837e_b35bdd6cb_1080x2400.png")
mesure(F5, (90, 1900, 1000, 1990), "mot rouge « Votre decision de structure… »", False)
mesure(F5, (330, 2075, 760, 2110), "sous-ligne « La carte vous attend encore. »", False)

print("\n=== CAPTURE H01 (avant geste) ===")
FH = os.path.join(CAP, "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")
mesure(FH, (220, 1335, 870, 1400), "titre « Des routes coupees » or/nuit", False)
mesure(FH, (185, 1425, 500, 1470), "« PORTEE majeure »", False)
mesure(FH, (325, 1505, 765, 1535), "« CE QU'ON PEUT FAIRE »", False)
mesure(FH, (165, 1605, 455, 1680), "bouton or : libelle sombre sur or", True)
mesure(FH, (560, 1605, 965, 1680), "bouton 2 : libelle clair sur nuit", False)
mesure(FH, (100, 1730, 655, 1860), "consequence gauche (petit texte)", False)
mesure(FH, (680, 1730, 960, 1860), "consequence droite (petit texte)", False)
mesure(FH, (350, 2060, 730, 2100), "« Aucune exception en attente »", False)

print("\n=== MAQUETTE (homologues) ===")
R6 = os.path.join(REF, "cadre-6-apres-geste-executed.png")
mesure(R6, (200, 585, 880, 640), "REF grave « VOUS AVEZ TRANCHE »", False)
mesure(R6, (110, 1480, 980, 1620), "REF mot-or", False)
mesure(R6, (280, 1690, 800, 1730), "REF ligne-or « RETOUR A L'ACCUEIL »", False)
mesure(R6, (250, 1740, 830, 1780), "REF sous-ligne", False)
mesure(R6, (810, 1320, 930, 1350), "REF jeton « LIBRE »", False)
mesure(R6, (770, 1355, 970, 1410), "REF « votre grande decision du jour »", False)
R5 = os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png")
mesure(R5, (260, 830, 820, 960), "REF titre « Un local a remettre en etat »", False)
mesure(R5, (330, 1070, 750, 1100), "REF « CE QU'ON PEUT FAIRE »", False)
mesure(R5, (120, 1290, 500, 1420), "REF consequence gauche", False)
