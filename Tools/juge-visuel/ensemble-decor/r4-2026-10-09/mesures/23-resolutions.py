#!/usr/bin/env python3
"""Autres resolutions — rien de coupe, rien hors cadre, le dock present.

Trois controles par capture :
  bord bas      : les 4 dernieres rangees portent-elles de l'encre ? (texte coupe par le bord)
  bord droit    : les 4 dernieres colonnes portent-elles de l'encre ?
  dock          : les 4 pastilles rondes du dock et leurs 4 libelles sont-ils dans l'image ?
                  (on compte les bandes de texte dans les 200 dernieres rangees)
Encre = ecart > 24/255 a la mediane de la bande consideree.
Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : les planches 2400, plus hautes, doivent toutes montrer le dock.
Controle negatif : une bande prise AU MILIEU de l'ecran doit, elle, porter de l'encre.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def encre_bande(im, box, seuil=24):
    px = list(im.crop(box).getdata()); n = len(px)
    fr = sorted(p[0] for p in px)[n // 2]; fg = sorted(p[1] for p in px)[n // 2]
    fb = sorted(p[2] for p in px)[n // 2]
    return sum(1 for p in px if (abs(p[0] - fr) + abs(p[1] - fg) + abs(p[2] - fb)) / 3 > seuil), n

NOMS = sorted(os.listdir(CAP))
print(f"{'fichier':50s} {'taille':12s} {'encre 4 der. rangees':>21s} {'encre 4 der. colonnes':>22s} {'bandes bas':>11s}")
for n in NOMS:
    im = ouvrir("cap", n[:-4])
    W, H = im.size
    b, nb = encre_bande(im, (0, H - 4, W, H))
    d, nd = encre_bande(im, (W - 4, 0, W, H))
    box = (40, H - 220, W - 40, H - 4)
    Wm, Hm, bits, f = masque(im, box)
    bs, _ = bandes(bits, Wm, Hm)
    print(f"{n[:-4]:50s} {str((W, H)):12s} {b:6d}/{nb:6d} ({100*b/nb:5.2f} %) "
          f"{d:6d}/{nd:6d} ({100*d/nd:5.2f} %) {len(bs):11d}")

print()
print("=== CONTROLE NEGATIF : bande au MILIEU de l'ecran (doit porter de l'encre) ===")
im = ouvrir("cap", "E01_Journal_1080x2400")
b, nb = encre_bande(im, (0, 1200, 1080, 1204))
print(f"   E01 y=1200..1204 : {b}/{nb} px d'encre ({100*b/nb:.1f} %)")
