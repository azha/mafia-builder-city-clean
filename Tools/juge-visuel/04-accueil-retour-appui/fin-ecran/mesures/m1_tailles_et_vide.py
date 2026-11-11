#!/usr/bin/env python3
"""m1 — preuve de lecture : taille de CHAQUE image du dossier + garde anti-vide (>= 5 % de pixels non noirs).
Contrôle positif : la largeur de TOUTES les images doit valoir 1080 (dossier.md, echelle x3,6 des deux cotes).
Controle negatif : on imprime aussi la hauteur, qui DOIT differer entre reference (2102) et captures (1920/2400).
"""
import os, glob
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def taux_non_noir(im, seuil=24):
    p = im.convert("RGB").resize((270, im.height * 270 // im.width))
    n = 0
    px = list(p.getdata())
    for r, g, b in px:
        if r > seuil or g > seuil or b > seuil:
            n += 1
    return 100.0 * n / len(px)

print("=== m1 : tailles + anti-vide ===")
larg = set()
haut = {}
for p in sorted(glob.glob(D + "/reference/*.png")) + sorted(glob.glob(D + "/captures/*.png")):
    im = Image.open(p)
    t = taux_non_noir(im)
    larg.add(im.width)
    haut.setdefault(im.height, []).append(os.path.basename(p))
    print(f"{os.path.relpath(p, D):62s} {im.width}x{im.height}  non-noir={t:5.1f}%  {'OK' if t >= 5 else 'VIDE!'}")

print()
print(f"CONTROLE POSITIF  largeurs distinctes = {sorted(larg)}  -> attendu [1080] : {'OK' if sorted(larg)==[1080] else 'ECHEC'}")
print(f"CONTROLE NEGATIF  hauteurs distinctes = {sorted(haut)}  -> doit contenir 2102 ET 1920 ET 2400 : "
      f"{'OK' if set(haut) == {1920, 2102, 2400} else 'ECHEC'}")
