#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m15 — profil LIGNE PAR LIGNE sous un texte : un souligné (même pointillé) est UNE
rangée (ou deux) dont le compte d'encre claire explose sur toute la largeur du texte.
Le profil se lit directement : pas de seuil arbitraire à défendre.

Encre claire = pixel dont la luminance 0-255 dépasse de +25 la médiane de la rangée.
On imprime n(y) pour 30 rangées sous le bas de l'encre du texte, et la largeur occupée
(x_max - x_min) de ces pixels, qui distingue un souligné (large) d'une 2e ligne de texte
(large aussi) d'un bruit de décor (dispersé). Pour trancher, on imprime aussi le
DÉCOUPAGE EN PLAGES de la rangée la plus chargée : un pointillé donne 15 à 60 plages
courtes régulières ; une ligne de texte donne des plages de largeurs très inégales.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
C5 = os.path.join(RACINE, "reference", "cadre-5-tete-sur-ligne-haute.png")
H01 = os.path.join(RACINE, "captures", "H01_AccueilTete_Cadre5_cb56d837e_b35bdd6cb_1080x2400.png")


def L8(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def profil(chemin, x0, x1, y0, y1, nom):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    print("\n  %s  — %s %dx%d  bande x %d..%d, y %d..%d" % (nom, os.path.basename(chemin)[:34], im.width, im.height, x0, x1, y0, y1))
    meilleur = (0, None, None)
    for y in range(y0, y1 + 1):
        vals = [L8(px[x, y]) for x in range(x0, x1 + 1)]
        base = sorted(vals)[len(vals) // 2]
        marq = [x0 + i for i, v in enumerate(vals) if v > base + 25]
        n = len(marq)
        larg = (marq[-1] - marq[0] + 1) if marq else 0
        # plages
        plages = []
        if marq:
            deb = marq[0]; prec = marq[0]
            for x in marq[1:]:
                if x - prec > 1:
                    plages.append(prec - deb + 1); deb = x
                prec = x
            plages.append(prec - deb + 1)
        bar = "#" * min(60, n // 4)
        print("     y=%4d  n=%4d  largeur=%4d  plages=%3d  %s" % (y, n, larg, len(plages), bar))
        if n > meilleur[0]:
            meilleur = (n, y, plages)
    if meilleur[1] is not None:
        p = meilleur[2]
        print("     rangee la plus chargee : y=%d, %d plages, largeurs = %s" % (meilleur[1], len(p), p[:40]))


print("=== « CE QU'ON PEUT FAIRE » : 30 rangees sous le bas de l'encre ===")
profil(C5, 333, 739, 1096, 1126, "MAQUETTE cadre-5")
profil(H01, 335, 744, 1529, 1559, "CAPTURE H01")

print("\n=== 1re ligne de consequence (colonne gauche) : 30 rangees sous le bas de l'encre ===")
profil(C5, 121, 499, 1328, 1358, "MAQUETTE cadre-5")
profil(H01, 108, 650, 1762, 1792, "CAPTURE H01")
