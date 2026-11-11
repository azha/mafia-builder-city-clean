#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""POINT 2 — non-regression de l'apres-geste G01..G06 (2400 et 1920) :
capture du tour courant (captures/) vs MEME etat du tour precedent (avant-t2/).

Mesure par paire : nombre de pixels qui DIFFERENT (RGB strict), nombre qui
different de plus de 8/255 sur un canal (seuil de perception), bbox englobante,
delta max par canal.

Controles de l'instrument :
  POSITIF  — une capture comparee a ELLE-MEME doit rendre 0 pixel different.
  NEGATIF  — deux etats differents (G01 vs G02, meme resolution) doivent rendre
             un nombre de pixels differents TRES grand et une bbox large.
Chaque ouverture imprime la taille de l'image lue.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAP = os.path.join(D, "captures")
AV = os.path.join(D, "avant-t2")


def charger(path):
    im = Image.open(path).convert("RGB")
    print("      ouvert %-70s %s" % (os.path.basename(path), im.size))
    return im


def diff(pa, pb, nom, seuil=8):
    a = charger(pa)
    b = charger(pb)
    if a.size != b.size:
        print("    %-34s TAILLES DIFFERENTES %s vs %s" % (nom, a.size, b.size))
        return
    pa_ = a.load()
    pb_ = b.load()
    w, h = a.size
    n = 0
    nperc = 0
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    dmax = 0
    for y in range(h):
        for x in range(w):
            p = pa_[x, y]
            q = pb_[x, y]
            if p != q:
                n += 1
                d = max(abs(p[0] - q[0]), abs(p[1] - q[1]), abs(p[2] - q[2]))
                if d > dmax:
                    dmax = d
                if d >= seuil:
                    nperc += 1
                    if x < x0:
                        x0 = x
                    if x > x1:
                        x1 = x
                    if y < y0:
                        y0 = y
                    if y > y1:
                        y1 = y
    tot = w * h
    bb = "bbox(>=%d) x=[%d..%d] y=[%d..%d]" % (seuil, x0, x1, y0, y1) if x1 >= 0 else "aucune zone >= %d" % seuil
    print("    %-34s diff=%8d px (%.5f %%)   diff>=%d/255 = %7d px   deltaMax=%3d   %s"
          % (nom, n, 100.0 * n / tot, seuil, nperc, dmax, bb))


print(">>> CONTROLE POSITIF (meme fichier des deux cotes : 0 attendu)")
diff(os.path.join(CAP, "G01_ApresGeste_executed_c4c6fc581_b35bdd6cb_1080x2400.png"),
     os.path.join(CAP, "G01_ApresGeste_executed_c4c6fc581_b35bdd6cb_1080x2400.png"),
     "G01-2400 vs lui-meme")

print()
print(">>> CONTROLE NEGATIF (deux etats differents : grand nombre attendu)")
diff(os.path.join(CAP, "G01_ApresGeste_executed_c4c6fc581_b35bdd6cb_1080x2400.png"),
     os.path.join(CAP, "G02_ApresGeste_noted_c4c6fc581_b35bdd6cb_1080x2400.png"),
     "G01-2400 vs G02-2400")

print()
print(">>> LES 12 PAIRES DU POINT 2  (captures/ vs avant-t2/)")
ETATS = [
    ("G01_ApresGeste_executed", ),
    ("G02_ApresGeste_noted", ),
    ("G03_ApresGeste_deja_tranchee", ),
    ("G04_ApresGeste_404_plus_la", ),
    ("G05_ApresGeste_premiere_cible_en_echec", ),
    ("G06_ApresGeste_noted_structurelle", ),
]
for (e, ) in ETATS:
    for res in ("1080x2400", "1080x1920"):
        pa = os.path.join(CAP, "%s_c4c6fc581_b35bdd6cb_%s.png" % (e, res))
        pb = os.path.join(AV, "%s_c3aa3bbdb_b35bdd6cb_%s.png" % (e, res))
        diff(pa, pb, "%s %s" % (e[:30], res))
