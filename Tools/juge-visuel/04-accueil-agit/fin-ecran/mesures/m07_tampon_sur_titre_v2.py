#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m07 — LE POINT OUVERT, version 2 (la v1 m06 a RATÉ son contrôle positif : la bande
prise incluait l'ombre de la carte sur le feutre, donc comptait du noir qui n'est pas du
texte. Ici on reste DANS le champ crème de la carte et le seuil d'encre est ADAPTATIF).

Région analysée : le champ crème intérieur de la carte (plages crème mesurées par m03 :
réf x 96..688, capture x 90..693), bande verticale 0,18 -> 0,72 de la hauteur de carte.
Encre = pixel dont la luminance est sous (L_creme + L_min)/2, et qui n'est PAS rouge
brique (le tampon, r-g >= 55, est exclu : on compte le TEXTE, pas le tampon).

Contrôles :
  + positif A : bande basse (0,80..0,99 : PORTÉE / URGENCE / libellés), que le tampon ne
    touche dans aucune image -> le compte d'encre doit être le même avec et sans tampon.
  + positif B : G02 et G04, deux captures sans tampon de la MÊME carte -> même compte.
  + le fond crème échantillonné (médiane) est imprimé des deux côtés : si les deux encres
    n'étaient pas comparables, ça se verrait là.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6

CAS = {
    # nom : (chemin, x_interieur0, x_interieur1, carte_y0, carte_y1)
    "REF cadre-6 (tampon)": (os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png"), 96, 688, 689, 1451),
    "REF cadre-7 (nu)":     (os.path.join(RACINE, "reference", "cadre-7-echec-1re-cible.png"), 96, 688, 806, 1571),
    "CAP G01 (tampon)":     (os.path.join(RACINE, "captures", "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), 90, 693, 1046, 1810),
    "CAP G06 (tampon)":     (os.path.join(RACINE, "captures", "G06_ApresGeste_noted_structurelle_cb56d837e_b35bdd6cb_1080x2400.png"), 90, 693, 1142, 1906),
    "CAP G02 (nu)":         (os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), 90, 693, 1142, 1906),
    "CAP G04 (nu)":         (os.path.join(RACINE, "captures", "G04_ApresGeste_404_plus_la_cb56d837e_b35bdd6cb_1080x2400.png"), 90, 693, 1142, 1906),
}
BANDES = {"titre": (0.18, 0.72), "bas (ctrl +A)": (0.80, 0.99)}


def lum(r, g, b):
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def rouge_brique(r, g, b):
    return r >= 100 and r - g >= 55 and r - b >= 55


def mesure(chemin, xa, xb, cy0, cy1, bande):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    H = cy1 - cy0 + 1
    y0 = cy0 + int(bande[0] * H)
    y1 = cy0 + int(bande[1] * H)
    vals = []
    for y in range(y0, y1 + 1):
        for x in range(xa, xb + 1):
            r, g, b = px[x, y]
            if not rouge_brique(r, g, b):
                vals.append(lum(r, g, b))
    vals.sort()
    l_fond = vals[int(0.90 * len(vals))]          # le crème domine : 90e centile = fond
    l_min = vals[int(0.002 * len(vals))]          # 0,2e centile = coeur d'encre
    seuil = (l_fond + l_min) / 2.0
    n = 0
    bx0, by0, bx1, by1 = 10 ** 9, 10 ** 9, -1, -1
    for y in range(y0, y1 + 1):
        for x in range(xa, xb + 1):
            r, g, b = px[x, y]
            if rouge_brique(r, g, b):
                continue
            if lum(r, g, b) < seuil:
                n += 1
                bx0 = min(bx0, x); bx1 = max(bx1, x)
                by0 = min(by0, y); by1 = max(by1, y)
    bbox = (bx0, by0, bx1, by1) if bx1 > 0 else None
    return dict(taille=im.size, y=(y0, y1), fond=l_fond, lmin=l_min, seuil=seuil, n=n, bbox=bbox)


print("=== ENCRE DU TEXTE DANS LE CHAMP CREME DE LA CARTE ===")
R = {}
for bande_nom, bande in BANDES.items():
    print("\n--- bande %s (%.2f..%.2f de la hauteur de carte) ---" % (bande_nom, bande[0], bande[1]))
    for nom, (chemin, xa, xb, cy0, cy1) in CAS.items():
        m = mesure(chemin, xa, xb, cy0, cy1, bande)
        R[(bande_nom, nom)] = m["n"]
        print("  %-22s %s %dx%d | y %d..%d | L_fond=%5.1f L_min=%5.1f seuil=%5.1f | ENCRE=%6d px | bbox=%s"
              % (nom, os.path.basename(chemin)[:30], m["taille"][0], m["taille"][1],
                 m["y"][0], m["y"][1], m["fond"], m["lmin"], m["seuil"], m["n"], m["bbox"]))

print("\n=== CONTROLES ===")
a = R[("bas (ctrl +A)", "REF cadre-6 (tampon)")]; b = R[("bas (ctrl +A)", "REF cadre-7 (nu)")]
print("  +A REF  bande basse : cadre-6 %d vs cadre-7 %d -> ecart %.1f %%" % (a, b, 100.0 * abs(a - b) / b))
a = R[("bas (ctrl +A)", "CAP G01 (tampon)")]; b = R[("bas (ctrl +A)", "CAP G02 (nu)")]
print("  +A CAP  bande basse : G01 %d vs G02 %d -> ecart %.1f %%" % (a, b, 100.0 * abs(a - b) / b))
a = R[("titre", "CAP G04 (nu)")]; b = R[("titre", "CAP G02 (nu)")]
print("  +B CAP  bande titre, deux captures NUES : G04 %d vs G02 %d -> ecart %.1f %%" % (a, b, 100.0 * abs(a - b) / b))

print("\n=== REPONSE AU POINT OUVERT ===")
r6 = R[("titre", "REF cadre-6 (tampon)")]; r7 = R[("titre", "REF cadre-7 (nu)")]
g1 = R[("titre", "CAP G01 (tampon)")]; g6 = R[("titre", "CAP G06 (tampon)")]; g2 = R[("titre", "CAP G02 (nu)")]
print("  MAQUETTE : titre sous tampon %d / titre nu %d = %.1f %% d'encre survivante (donc %.1f %% recouverts)"
      % (r6, r7, 100.0 * r6 / r7, 100 - 100.0 * r6 / r7))
print("  G01      : %d / %d = %.1f %% survivante (%.1f %% recouverts)" % (g1, g2, 100.0 * g1 / g2, 100 - 100.0 * g1 / g2))
print("  G06      : %d / %d = %.1f %% survivante (%.1f %% recouverts)" % (g6, g2, 100.0 * g6 / g2, 100 - 100.0 * g6 / g2))
