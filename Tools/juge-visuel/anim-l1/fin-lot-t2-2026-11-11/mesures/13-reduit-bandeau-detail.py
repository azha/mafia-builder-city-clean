#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""13 — Q3 (bandeau) : le bandeau sous Reduit est-il A SON REPOS des l'annonce ?

Le texte du bandeau differe entre la partie « reduite » et la partie « normale »
(« Lt. Kest attend vos ordres » vs « Les indics parlent : la brigade s'agite ») :
aucune egalite au pixel n'est possible. On compare donc les grandeurs INDEPENDANTES
du texte, sur la colonne x=250 (hors texte) : filet haut, fond du panneau, filet bas.

Controle POSITIF : `bandeau-entree_t200ms_1080x2400` (repos connu) sert d'etalon.
Controle NEGATIF : `bandeau-entree_t70ms_1080x2400` (alpha 0,507, decale de 14 px)
   doit donner des valeurs NETTEMENT differentes.
"""
import os
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "captures")

for rel in ["reduit/reduit-bandeau-entree_apres-annonce_1080x2400.png",
            "bandeau-entree_t200ms_1080x2400.png",
            "bandeau-entree_t70ms_1080x2400.png"]:
    im = Image.open(os.path.join(BASE, rel)).convert("RGB")
    print("== %-56s taille=%dx%d" % (rel, im.size[0], im.size[1]))
    p = im.load()
    paliers = []
    prec = None
    for y in range(185, 300):
        v = p[250, y]
        if v != prec:
            paliers.append((y, v))
            prec = v
    for y, v in paliers:
        print("     y=%3d -> %s" % (y, v))
    print("")
