#!/usr/bin/env python3
"""Les ancres de la carte tombent-elles sur des BÂTIMENTS, ou sur du sol nu ?

POURQUOI. Le client pose les marqueurs de possession du joueur au `pivot_px` que la carte
d'ancrage donne pour son bloc. Tant que le fond livré était une PLAQUE — bâtiments retirés —
l'ancre DÉFINISSAIT la vérité : Unity redessinait le bâtiment là. Depuis que le fond porte la
ville entière, l'ancre doit désigner un bâtiment QUI EXISTE DANS L'IMAGE, sinon le marqueur
flotte au-dessus du bitume. C'est ce qui a été mesuré en jeu.

COMMENT. Un bâtiment porte des arêtes, des fenêtres, des lignes de toit : sa variance locale est
élevée. Le sol, la rue et l'eau sont des aplats. On échantillonne donc une fenêtre autour de
chaque ancre et on lit son ÉCART-TYPE de luminance.

⚠️ Le seuil n'est pas choisi : il est LU sur la distribution des deux populations (voir la sortie
`--calibrer`, qui imprime les déciles). Un seuil inventé ferait de cet instrument un juge de
complaisance.

⚠️ Et l'instrument déclare son RÉGIME : combien d'ancres lues, combien hors image, quelle taille
de fenêtre. Un dispositif qui ne dit pas s'il s'est appliqué ressemble trait pour trait à un
dispositif appliqué.

Usage : python3 Tools/mesure-ancres-sur-batiments.py <ancrage.json> <fond.png> [seuil]
"""
import json
import sys
from PIL import Image

FENETRE = 12          # demi-côté de la fenêtre d'échantillonnage, en px du fond
SEUIL_DEFAUT = 9.0    # écart-type de luminance — voir le calibrage dans les notes


def luminance(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ecart_type(px, cx, cy, w, h):
    vals = []
    for y in range(max(0, cy - FENETRE), min(h, cy + FENETRE + 1), 2):
        for x in range(max(0, cx - FENETRE), min(w, cx + FENETRE + 1), 2):
            vals.append(luminance(px[x, y]))
    if len(vals) < 8:
        return None
    m = sum(vals) / len(vals)
    return (sum((v - m) ** 2 for v in vals) / len(vals)) ** 0.5


def main():
    carte = json.load(open(sys.argv[1]))
    im = Image.open(sys.argv[2]).convert("RGB")
    seuil = float(sys.argv[3]) if len(sys.argv) > 3 else SEUIL_DEFAUT
    w, h = im.size
    px = im.load()

    ancres = carte.get("parcelles") or []
    mesures, hors, sans = [], 0, 0
    for a in ancres:
        cx, cy = int(round(a["pivot_px"][0])), int(round(a["pivot_px"][1]))
        if not (0 <= cx < w and 0 <= cy < h):
            hors += 1
            continue
        s = ecart_type(px, cx, cy, w, h)
        if s is None:
            sans += 1
            continue
        mesures.append((s, a.get("nom", "(%d,%d)" % (a["x"], a["y"])), cx, cy))

    print("RÉGIME : %d ancres dans la carte, %d mesurées, %d hors image, %d sans fenêtre ; "
          "fenêtre %dx%d px sur un fond %dx%d"
          % (len(ancres), len(mesures), hors, sans, 2 * FENETRE + 1, 2 * FENETRE + 1, w, h))
    if not mesures:
        print("AUCUNE ancre mesurable — ce n'est pas un bon résultat, c'est une NON-MESURE.")
        return 2

    mesures.sort()
    n = len(mesures)
    print("  déciles de l'écart-type : " +
          "  ".join("%.1f" % mesures[min(n - 1, i * n // 10)][0] for i in range(10)))
    sur_bati = [m for m in mesures if m[0] >= seuil]
    print("  seuil %.1f  →  SUR UN BÂTIMENT : %d / %d  (%.0f %%)"
          % (seuil, len(sur_bati), n, 100.0 * len(sur_bati) / n))
    print("  les 6 ancres les plus PLATES (donc sur du sol nu) :")
    for s, nom, cx, cy in mesures[:6]:
        print("     ecart-type %5.1f   %-26s  px (%d,%d)" % (s, nom, cx, cy))
    return 0


if __name__ == "__main__":
    sys.exit(main())
