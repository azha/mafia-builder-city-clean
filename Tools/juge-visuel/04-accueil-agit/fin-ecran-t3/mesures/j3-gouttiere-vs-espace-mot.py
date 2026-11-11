#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""POINT 1 (perception) — la gouttiere entre les deux consequences se distingue-t-elle
d'un simple espace de mot ?

Un bloc "sous son option" n'est lisible comme tel que si le trou qui le separe du bloc
voisin est NETTEMENT plus large que les trous internes au texte (espaces de mots). On
mesure donc, ligne par ligne, tous les trous de fond a l'interieur de l'etage des
consequences, et on compare le plus grand trou INTERNE a une colonne au trou qui separe
les deux colonnes.

Controles :
  POSITIF — sur la REFERENCE (mise en page ratifiee), le rapport gouttiere/espace-de-mot
            doit etre nettement > 1 : c'est la valeur a battre.
  NEGATIF — le meme calcul avec un seuil d'encre absurde (s=250, rien n'est encre) doit
            ne trouver AUCUNE ligne : l'instrument ne doit pas inventer de trous.
Chaque ouverture imprime la taille de l'image.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
X0, X1 = 40, 1045


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def trous(px, y0, y1, s):
    """trous de fond (>= 1 px) sur la projection verticale de la bande [y0..y1]"""
    enc = [any(lum(px[x, y]) > s for y in range(y0, y1 + 1)) for x in range(X0, X1)]
    if not any(enc):
        return None, []
    i0 = enc.index(True)
    i1 = len(enc) - 1 - enc[::-1].index(True)
    g = []
    d = None
    for i in range(i0, i1 + 1):
        if not enc[i]:
            d = i if d is None else d
        elif d is not None:
            g.append((d + X0, i - 1 + X0))
            d = None
    return (i0 + X0, i1 + X0), g


def bandes(px, y0, y1, s):
    out, cur = [], None
    for y in range(y0, y1):
        xs = any(lum(px[x, y]) > s for x in range(X0, X1))
        if xs and cur is None:
            cur = [y, y]
        elif xs:
            cur[1] = y
        elif cur is not None:
            if cur[1] - cur[0] >= 3:
                out.append(cur)
            cur = None
    if cur is not None and cur[1] - cur[0] >= 3:
        out.append(cur)
    return out


JEUX = [
    ("REFERENCE cadre 5", os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), 1285, 1475, 502, 591),
    ("CAPTURE H01 2400", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x2400.png"), 1678, 1880, 521, 564),
    ("CAPTURE H01 1920", os.path.join(CAP, "H01_AccueilTete_Cadre5_c4c6fc581_b35bdd6cb_1080x1920.png"), 1224, 1425, 521, 564),
]

for s in (95, 250):
    print()
    print("=== SEUIL D'ENCRE %d %s" % (s, "(CONTROLE NEGATIF : aucune ligne attendue)" if s == 250 else ""))
    for nom, path, y0, y1, gx0, gx1 in JEUX:
        im = Image.open(path).convert("RGB")
        print("  %s   ouvert %s %s" % (nom, os.path.basename(path)[:40], im.size))
        px = im.load()
        bs = bandes(px, y0, y1, s)
        if not bs:
            print("      aucune ligne detectee")
            continue
        pire = 0
        pire_ou = None
        for b in bs:
            ext, g = trous(px, b[0], b[1], s)
            # un trou INTERNE est entierement d'un cote de la gouttiere nominale : un trou qui
            # CONTIENT la gouttiere (ligne courte d'un cote) est inter-colonnes, pas un espace
            # de mot. (1re version de ce script : filtre inverse, qui rendait 140/184 px — des
            # trous inter-colonnes comptes comme espaces de mot. Corrige.)
            internes = [(a, z) for (a, z) in g if z < gx0 or a > gx1]
            lg = [z - a + 1 for (a, z) in internes]
            mx = max(lg) if lg else 0
            if mx > pire:
                pire, pire_ou = mx, (b, [(a, z) for (a, z) in internes if z - a + 1 == mx][0])
            print("      ligne y=[%4d..%4d] x=[%4d..%4d]  %2d trou(s) internes  max=%3d px (%.2f CSS)"
                  % (b[0], b[1], ext[0], ext[1], len(internes), mx, mx / ECH))
        larg = gx1 - gx0 + 1
        print("      >>> GOUTTIERE inter-colonnes = %d px (%.2f CSS)   PLUS GRAND trou interne = %d px (%.2f CSS) %s"
              % (larg, larg / ECH, pire, pire / ECH, "en y=%s x=%s" % (pire_ou[0], pire_ou[1]) if pire_ou else ""))
        if pire:
            print("      >>> RAPPORT gouttiere / plus grand espace interne = %.2f" % (float(larg) / pire))
