#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m08 — crops de travail (le juge regarde l'IMAGE ; les crops sont mis a la MEME echelle
d'affichage pour que l'oeil compare des grandeurs comparables)."""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
SORTIE = os.path.join(RACINE, "mesures", "crops")
os.makedirs(SORTIE, exist_ok=True)

JOBS = [
    ("ref_cadre6_carte", os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png"), (40, 660, 980, 1480)),
    ("ref_cadre7_carte", os.path.join(RACINE, "reference", "cadre-7-echec-1re-cible.png"), (40, 780, 980, 1600)),
    ("cap_G01_carte", os.path.join(RACINE, "captures", "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), (40, 1000, 980, 1830)),
    ("cap_G02_carte", os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), (40, 1096, 980, 1926)),
    ("cap_G06_carte", os.path.join(RACINE, "captures", "G06_ApresGeste_noted_structurelle_cb56d837e_b35bdd6cb_1080x2400.png"), (40, 1096, 980, 1926)),
    ("cap_G05_grave_disque", os.path.join(RACINE, "captures", "G05_ApresGeste_premiere_cible_en_echec_cb56d837e_b35bdd6cb_1080x2400.png"), (60, 1010, 1020, 1200)),
    ("cap_G02_grave_disque", os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), (60, 1040, 1020, 1230)),
    ("cap_G03_grave_disque", os.path.join(RACINE, "captures", "G03_ApresGeste_deja_tranchee_cb56d837e_b35bdd6cb_1080x2400.png"), (60, 1118, 1020, 1308)),
    ("cap_G04_haut_panneau", os.path.join(RACINE, "captures", "G04_ApresGeste_404_plus_la_cb56d837e_b35bdd6cb_1080x2400.png"), (520, 1050, 840, 1230)),
    ("ref_cadre6_grave", os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png"), (60, 545, 1020, 760)),
    ("ref_cadre5_gestes", os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png"), (40, 1020, 1040, 1450)),
    ("cap_H01_gestes", os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png"), (40, 1310, 1040, 1870)),
    ("ref_cadre5_file", os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png"), (40, 1520, 1040, 1830)),
    ("cap_H01_file", os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png"), (40, 1900, 1040, 2180)),
]

for nom, chemin, box in JOBS:
    im = Image.open(chemin).convert("RGB")
    print("  lu %-52s %dx%d -> crop %s" % (os.path.basename(chemin)[:52], im.width, im.height, box))
    im.crop(box).save(os.path.join(SORTIE, nom + ".png"))
print("crops dans", SORTIE)
