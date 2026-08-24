#!/usr/bin/env python3
"""Assemble la carte d'ancrage livrée : bâtiments réels d'abord, grille VALIDÉE ensuite.

POURQUOI une fusion plutôt qu'une source unique. Les deux cartes disponibles ont chacune un
défaut que l'autre n'a pas :
  · les ancres dérivées des BÂTIMENTS de la scène sont sur un bâtiment par construction — mesuré
    11/11 — mais elles ne sont que 11, alors que le back adresse une quarantaine de blocs ;
  · la grille de PARCELLES en fournit 60, mais 13 d'entre elles tombent sur du sol nu, de la rue,
    un véhicule ou l'eau — et les premiers rangs, ceux que le kit de départ occupe, sont
    justement parmi les mauvais (blocs (0,0) et (1,0) mesurés à 0,5 d'écart-type).

On prend donc les 11 sûres, puis on COMPLÈTE avec les ancres de grille que l'instrument valide,
en écartant celles qui tomberaient sur une ancre déjà prise. Les rangs sont réattribués dans
l'ordre du fichier, si bien que les premiers blocs — ceux du kit de départ — reçoivent les ancres
les plus sûres.

⚠️ Le seuil de validation n'est pas choisi ici : il vient de `mesure-ancres-sur-batiments.py`, dont
la distribution est bimodale sur ces données (aplats à 0,3-0,5 contre bâtiments à 10-31).

Usage : python3 Tools/fusion-ancres.py <reelles.json> <grille.json> <fond.png> <sortie.json>
"""
import json
import math
import sys
from PIL import Image

SEUIL_BATIMENT = 9.0
FENETRE = 12
ECART_MIN_PX = 60.0   # deux ancres plus proches que ça désigneraient le même bâtiment


def luminance(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ecart_type(px, cx, cy, w, h):
    vals = [luminance(px[x, y])
            for y in range(max(0, cy - FENETRE), min(h, cy + FENETRE + 1), 2)
            for x in range(max(0, cx - FENETRE), min(w, cx + FENETRE + 1), 2)]
    if len(vals) < 8:
        return 0.0
    m = sum(vals) / len(vals)
    return (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5


def main():
    reelles = json.load(open(sys.argv[1]))
    grille = json.load(open(sys.argv[2]))
    im = Image.open(sys.argv[3]).convert("RGB")
    sortie = sys.argv[4]
    w, h = im.size
    px = im.load()

    retenues = list(reelles["parcelles"])
    print("RÉGIME : %d ancres de bâtiments réels, %d ancres de grille en réserve"
          % (len(retenues), len(grille["parcelles"])))

    ajoutees, rejet_plat, rejet_proche = 0, 0, 0
    for a in grille["parcelles"]:
        cx, cy = int(round(a["pivot_px"][0])), int(round(a["pivot_px"][1]))
        if not (0 <= cx < w and 0 <= cy < h):
            continue
        if ecart_type(px, cx, cy, w, h) < SEUIL_BATIMENT:
            rejet_plat += 1
            continue
        trop_proche = any(math.hypot(cx - r["pivot_px"][0], cy - r["pivot_px"][1]) < ECART_MIN_PX
                          for r in retenues)
        if trop_proche:
            rejet_proche += 1
            continue
        retenues.append({
            "nom": "grille_%d_%d" % (a["x"], a["y"]), "monde": a["monde"],
            "pivot_px": a["pivot_px"], "largeur_px": a["largeur_px"],
        })
        ajoutees += 1

    print("  grille : %d ajoutées, %d rejetées (aplat), %d rejetées (trop proches d'une ancre prise)"
          % (ajoutees, rejet_plat, rejet_proche))

    for i, a in enumerate(retenues):
        a["x"] = i % 10
        a["y"] = i // 10

    data = dict(reelles)
    data["profil"] = "batiments-reels+grille-validee"
    data["parcelles"] = retenues
    json.dump(data, open(sortie, "w"), indent=2)
    print("ÉCRIT : %s — %d ancres, rangs 0..%d" % (sortie, len(retenues), len(retenues) - 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
