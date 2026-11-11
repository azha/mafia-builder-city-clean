#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""11 — profil colonne par colonne d'une ligne de texte (x, y_haut, y_bas). Sert a isoler A LA MAIN
le premier glyphe quand la segmentation automatique de 10 ne tombe pas sur le bon compte (texte
tres espace ou lettres qui se touchent). Aucune conclusion ici : on lit le profil et on en deduit
la fenetre exacte, qui est ensuite mesuree.
Contrôle : la colonne de depart et la colonne de fin imprimees doivent encadrer un trou — sinon on
lit deux glyphes pour un.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")


def profil(path, nom, x0, x1, y0, y1, seuil=165):
    im = Image.open(path)
    px = im.convert("RGB").load()
    print("--- %s  [%s %s]  x=[%d..%d] y=[%d..%d]" % (nom, os.path.basename(path)[:30], im.size, x0, x1, y0, y1))
    out = []
    for x in range(x0, x1):
        ys = [y for y in range(y0, y1)
              if (0.299 * px[x, y][0] + 0.587 * px[x, y][1] + 0.114 * px[x, y][2]) < seuil]
        out.append("%d:%s" % (x, ("%d-%d" % (min(ys), max(ys))) if ys else "."))
    # on imprime 12 colonnes par ligne
    for i in range(0, len(out), 12):
        print("    " + "  ".join(out[i:i + 12]))
    print()


R7 = os.path.join(REF, "cadre-7-echec-1re-cible.png")
G05 = os.path.join(CAP, "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png")

profil(R7, "ref cadre 7 'moderee' debut", 134, 200, 1480, 1535)
profil(G05, "capture G05 'majeure' debut", 134, 200, 1795, 1850)
profil(R7, "ref cadre 7 'TACTIQUE' debut", 122, 190, 890, 925)
profil(G05, "capture G05 'TACTIQUE' debut", 167, 240, 1148, 1190)
