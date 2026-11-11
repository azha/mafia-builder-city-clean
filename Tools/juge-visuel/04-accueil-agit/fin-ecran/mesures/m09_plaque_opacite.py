#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m09 — la PLAQUE du tampon est-elle translucide (maquette) ou opaque (jeu) ?

Dans la maquette, le titre se LIT à travers la plaque du tampon (texte grisé). Dans la
capture, la plaque semble pleine. Mesure : dans une fenêtre entièrement INTÉRIEURE à la
plaque et posée SUR le titre, on compte les pixels « plus sombres que la plaque » (non
rouge-brique, donc ni la lettre ni le bord du tampon). Si le texte transparaît, ce compte
est élevé ; si la plaque est opaque, il est ~nul.

Contrôle positif : la MÊME statistique sur une fenêtre de titre HORS plaque (texte nu sur
carte) doit être élevée des DEUX côtés — l'instrument sait voir du texte.
Contrôle négatif : la même statistique sur une fenêtre VIDE de la carte (ni texte ni
plaque) doit être ~0 des deux côtés — l'instrument n'invente pas de texte.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
REF6 = os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png")
G01 = os.path.join(RACINE, "captures", "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png")
G06 = os.path.join(RACINE, "captures", "G06_ApresGeste_noted_structurelle_cb56d837e_b35bdd6cb_1080x2400.png")


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def brique(p):
    return p[0] >= 100 and p[0] - p[1] >= 55 and p[0] - p[2] >= 55


def stat(chemin, box, nom):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    vals = []
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            p = px[x, y]
            if not brique(p):
                vals.append((lum(p), p))
    vals.sort(key=lambda v: v[0])
    fond = vals[int(0.90 * len(vals))][0]
    sombre = sum(1 for v in vals if v[0] < fond - 35)
    print("  %-46s %s %dx%d" % (nom, os.path.basename(chemin)[:28], im.width, im.height))
    print("      fenetre=%s  n=%d non-brique | L_fond(p90)=%5.1f | L_min=%5.1f | pixels < fond-35 : %5d = %5.1f %%"
          % (box, len(vals), fond, vals[0][0], sombre, 100.0 * sombre / max(1, len(vals))))
    return 100.0 * sombre / max(1, len(vals))


print("=== SOUS LA PLAQUE, SUR LE TITRE ===")
a = stat(REF6, (300, 1022, 610, 1066), "REF cadre-6 : plaque sur « ettre en etat »")
b = stat(G01, (360, 1356, 650, 1404), "CAP G01     : plaque sur le titre")
c = stat(G06, (360, 1452, 650, 1500), "CAP G06     : plaque sur le titre")

print("\n=== CONTROLE POSITIF : titre NU (hors plaque) ===")
p1 = stat(REF6, (180, 990, 330, 1040), "REF cadre-6 : « Des lo » hors plaque")
p2 = stat(G01, (235, 1356, 330, 1404), "CAP G01     : « Des » hors plaque")

print("\n=== CONTROLE NEGATIF : champ VIDE de la carte ===")
n1 = stat(REF6, (150, 760, 600, 820), "REF cadre-6 : champ vide sous TACTIQUE")
n2 = stat(G01, (150, 1150, 600, 1230), "CAP G01     : champ vide sous TACTIQUE")

print("\n=== LECTURE ===")
print("  maquette : %.1f %% de pixels de texte sous la plaque  -> le titre TRANSPARAIT" % a)
print("  G01      : %.1f %% | G06 : %.1f %%  -> plaque OPAQUE si ~0" % (b, c))
print("  controles + : REF %.1f %% / CAP %.1f %% (texte nu, doit etre eleve des deux cotes)" % (p1, p2))
print("  controles - : REF %.1f %% / CAP %.1f %% (champ vide, doit etre ~0)" % (n1, n2))
