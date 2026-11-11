#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m06 — LE POINT OUVERT : le tampon « TRANCHÉE » recouvre-t-il le titre de la carte, et
la maquette fait-elle pareil ?

Principe : on compte l'ENCRE NOIRE du titre (pixels neutres sombres : r,g,b < 115 et
max-min < 45 — le tampon, lui, est rouge brique r-g > 55, il n'est donc PAS compté) dans
la bande du titre de la carte, définie en FRACTION de la hauteur de carte (invariant
d'échelle). On compare la MÊME carte avec et sans tampon :
    référence : cadre-7 (sans tampon) -> cadre-6 (avec tampon)   titre « Des locaux à remettre en état »
    capture   : G02    (sans tampon) -> G01 / G06 (avec tampon)  titre « Des routes coupées »
Le taux d'encre SURVIVANTE dit quelle part du titre reste lisible.

Contrôle positif : la bande « PORTÉE / majeure » (bas de carte), que le tampon ne touche
dans AUCUNE des deux, doit donner le même compte d'encre avec et sans tampon (écart < 5 %).
Contrôle négatif (sanité du masque) : l'encre noire comptée dans la bande du titre d'une
carte sans titre n'existe pas ici ; à la place on vérifie que le masque ne compte PAS le
tampon, en comptant séparément les pixels rouge-brique de la même bande.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6

# bbox exterieure de carte, mesurees par m04 (x0, y0, x1, y1)
CARTES = {
    "REF cadre-6 (tampon)":  (os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png"), 62, 689, 737, 1451),
    "REF cadre-7 (nu)":      (os.path.join(RACINE, "reference", "cadre-7-echec-1re-cible.png"), 74, 806, 725, 1571),
    "CAP G01 (tampon)":      (os.path.join(RACINE, "captures", "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), 71, 1046, 739, 1810),
    "CAP G06 (tampon)":      (os.path.join(RACINE, "captures", "G06_ApresGeste_noted_structurelle_cb56d837e_b35bdd6cb_1080x2400.png"), 71, 1142, 739, 1906),
    "CAP G02 (nu)":          (os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), 71, 1142, 739, 1906),
    "CAP G04 (nu)":          (os.path.join(RACINE, "captures", "G04_ApresGeste_404_plus_la_cb56d837e_b35bdd6cb_1080x2400.png"), 71, 1142, 739, 1906),
}

# bandes en fraction de la hauteur de carte
BANDE_TITRE = (0.18, 0.72)
BANDE_BAS = (0.80, 0.99)   # PORTEE / majeure / URGENCE / pressante : jamais sous le tampon


def encre_noire(r, g, b):
    return r < 115 and g < 115 and b < 115 and (max(r, g, b) - min(r, g, b)) < 45


def rouge_brique(r, g, b):
    return r >= 110 and r - g >= 55 and r - b >= 55


def compte(nom, chemin, x0, y0, x1, y1, bande):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    H = y1 - y0 + 1
    by0 = y0 + int(bande[0] * H)
    by1 = y0 + int(bande[1] * H)
    noir = 0; rouge = 0
    bx0, by_0, bx1, by_1 = 10 ** 9, 10 ** 9, -1, -1
    for y in range(by0, by1 + 1):
        for x in range(x0, x1 + 1):
            r, g, b = px[x, y]
            if encre_noire(r, g, b):
                noir += 1
                bx0 = min(bx0, x); bx1 = max(bx1, x)
                by_0 = min(by_0, y); by_1 = max(by_1, y)
            elif rouge_brique(r, g, b):
                rouge += 1
    bbox = (bx0, by_0, bx1, by_1) if bx1 > 0 else None
    return noir, rouge, bbox, (by0, by1), im.size


print("=== TAILLES + ENCRE NOIRE DANS LA BANDE DU TITRE (0,18 -> 0,72 de la carte) ===")
res = {}
for nom, (chemin, x0, y0, x1, y1) in CARTES.items():
    n, rg, bbox, bande, taille = compte(nom, chemin, x0, y0, x1, y1, BANDE_TITRE)
    res[nom] = n
    print("  %-22s  image %s  %dx%d" % (nom, os.path.basename(chemin)[:34], taille[0], taille[1]))
    print("      bande y %d..%d | encre NOIRE = %6d px | pixels rouge-brique (tampon) = %6d | bbox encre = %s"
          % (bande[0], bande[1], n, rg, bbox))

print("\n=== CONTROLE POSITIF : bande basse PORTEE/URGENCE (0,80 -> 0,99), jamais sous le tampon ===")
bas = {}
for nom, (chemin, x0, y0, x1, y1) in CARTES.items():
    n, rg, bbox, bande, taille = compte(nom, chemin, x0, y0, x1, y1, BANDE_BAS)
    bas[nom] = n
    print("  %-22s encre NOIRE bande basse = %6d px" % (nom, n))
print("  REF  : cadre-6 %d vs cadre-7 %d -> ecart %.1f %%"
      % (bas["REF cadre-6 (tampon)"], bas["REF cadre-7 (nu)"],
         100.0 * abs(bas["REF cadre-6 (tampon)"] - bas["REF cadre-7 (nu)"]) / bas["REF cadre-7 (nu)"]))
print("  CAP  : G01 %d vs G02 %d -> ecart %.1f %%"
      % (bas["CAP G01 (tampon)"], bas["CAP G02 (nu)"],
         100.0 * abs(bas["CAP G01 (tampon)"] - bas["CAP G02 (nu)"]) / bas["CAP G02 (nu)"]))

print("\n=== VERDICT DE LA MESURE : part du TITRE qui survit au tampon ===")
print("  REFERENCE  cadre-6 / cadre-7 = %d / %d = %.1f %% de l'encre du titre encore visible"
      % (res["REF cadre-6 (tampon)"], res["REF cadre-7 (nu)"],
         100.0 * res["REF cadre-6 (tampon)"] / res["REF cadre-7 (nu)"]))
print("  CAPTURE    G01 / G02        = %d / %d = %.1f %%"
      % (res["CAP G01 (tampon)"], res["CAP G02 (nu)"],
         100.0 * res["CAP G01 (tampon)"] / res["CAP G02 (nu)"]))
print("  CAPTURE    G06 / G02        = %d / %d = %.1f %%"
      % (res["CAP G06 (tampon)"], res["CAP G02 (nu)"],
         100.0 * res["CAP G06 (tampon)"] / res["CAP G02 (nu)"]))
print("  [sanite] G04 nu / G02 nu    = %d / %d = %.1f %%  (meme carte, aucun tampon : doit valoir ~100 %%)"
      % (res["CAP G04 (nu)"], res["CAP G02 (nu)"],
         100.0 * res["CAP G04 (nu)"] / res["CAP G02 (nu)"]))
