#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""07 — cote a cote a MEME ECHELLE (X est 1:1 entre reference et capture, verifie par le jeton :
diam 151 px ref / 150 px capture, centre x 882 / 881,5). On colle les crops dans /tmp pour l'oeil ;
aucun chiffre ne sort d'ici — ce sont les scripts 04/05/06/08.. qui mesurent.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
OUT = "/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/12bb723c-e30b-4127-8b2d-58b0fa9e44d9/scratchpad"
os.makedirs(OUT, exist_ok=True)


def colle(nom, a, b, marge=10):
    ia = Image.open(a[0]).convert("RGB").crop(a[1])
    ib = Image.open(b[0]).convert("RGB").crop(b[1])
    print("%s : gauche %s %s  |  droite %s %s" %
          (nom, os.path.basename(a[0]), ia.size, os.path.basename(b[0]), ib.size))
    h = max(ia.size[1], ib.size[1])
    w = ia.size[0] + ib.size[0] + marge
    out = Image.new("RGB", (w, h), (255, 0, 255))
    out.paste(ia, (0, 0))
    out.paste(ib, (ia.size[0] + marge, 0))
    p = os.path.join(OUT, nom)
    out.save(p)
    print("   -> %s %s" % (p, out.size))


# carte entiere + jeton
colle("cc_carte_cadre6_vs_G01.png",
      (os.path.join(REF, "cadre-6-apres-geste-executed.png"), (40, 660, 1040, 1480)),
      (os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (40, 1030, 1040, 1850)))

colle("cc_carte_cadre7_vs_G05.png",
      (os.path.join(REF, "cadre-7-echec-1re-cible.png"), (40, 780, 1040, 1600)),
      (os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (40, 1095, 1040, 1915)))

# coin haut-gauche de la carte : le losange + TACTIQUE
colle("cc_tactique.png",
      (os.path.join(REF, "cadre-6-apres-geste-executed.png"), (100, 680, 420, 820)),
      (os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (90, 1050, 410, 1190)))

# bas de carte : trait, PORTEE/URGENCE, pastilles
colle("cc_bande_bas.png",
      (os.path.join(REF, "cadre-6-apres-geste-executed.png"), (100, 1180, 720, 1460)),
      (os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (90, 1520, 710, 1800)))

# le grave + haut du panneau
colle("cc_grave.png",
      (os.path.join(REF, "cadre-6-apres-geste-executed.png"), (0, 530, 1080, 650)),
      (os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (0, 910, 1080, 1030)))

# pied : mot-or, lignes-or, retour
colle("cc_pied.png",
      (os.path.join(REF, "cadre-6-apres-geste-executed.png"), (0, 1460, 1080, 1870)),
      (os.path.join(CAP, "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png"), (0, 1800, 1080, 2210)))
