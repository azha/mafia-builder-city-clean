#!/usr/bin/env python3
"""JUGE-D4 (audit visuel du district, 2026-08-21, Défaut 4 — plaques translucides).

Mesure, pour chaque sprite de bâtiment J0 (lab/stash/front_shop/cash_safehouse), le footprint
OPAQUE réel (alpha >= 128) dans la bande où le Socle (ombre de contact,
DistrictInteriorScreenController.BuildBuildingCell) est dessiné — PAS la bande basse brute du
fichier, mais la bande APRÈS décalage par la marge basse mesurée (le repère que le Socle occupe
une fois corrigé). C'est cet écart entre "largeur du FICHIER" (cellW, ce que le code lisait avant
ce correctif) et "largeur du CONTENU opaque" (ce script) qui produisait des plaques semi-
transparentes flottant sur du pavé vide : le Socle, centré/dimensionné sur cellW, débordait dans
le vide, où rien ne le recouvre.

Usage :
    python3 Tools/juge_d4_socle_footprint_measure.py

Sortie : pour chaque sprite, largeur du footprint, décalage du centre par rapport au centre du
FICHIER, et marge basse (hauteur de vide sous le pied visuel) — les 3 valeurs écrites dans
Assets/Resources/BuildingSpriteSlots.asset (champs `*Footprint.widthPx/centerOffsetPx/
bottomMarginPx`).

Dépendances : Pillow, numpy (venv recommandé — voir Tools/pivot-fond-prerendu-p3-implementation-
notes.md pour le précédent de cette discipline de mesure).
"""
from PIL import Image
import numpy as np

FILES = {
    "lab": "Assets/Art/District/Sprites/usine_nuit_base_ppm24.0.png",
    "stash": "Assets/Art/District/Sprites/entrepot_nuit_base_ppm24.0.png",
    "frontShop": "Assets/Art/District/Sprites/epicerie_nuit_base_ppm24.0.png",
    "cashSafehouse": "Assets/Art/District/Sprites/residentiel3_nuit_base_ppm24.0.png",
}

ALPHA_THRESHOLD = 128
SOCLE_HEIGHT_FRACTION = 0.2  # DistrictInteriorScreenController.BuildBuildingCell: cellH * 0.2


def measure(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im)
    w, h = im.size
    alpha = a[:, :, 3]

    rows_with_content = np.where((alpha >= ALPHA_THRESHOLD).any(axis=1))[0]
    if len(rows_with_content) == 0:
        raise ValueError(f"{path}: sprite entièrement transparent — mesure impossible")
    last_opaque_row = int(rows_with_content.max())  # top-down (row 0 = haut du fichier)
    bottom_margin_px = h - 1 - last_opaque_row

    band_h = h * SOCLE_HEIGHT_FRACTION
    row_top = max(0, int(round(h - bottom_margin_px - band_h)))
    row_bot = h - bottom_margin_px
    band = alpha[row_top:row_bot, :]
    colmask = (band >= ALPHA_THRESHOLD).any(axis=0)
    cols = np.where(colmask)[0]
    if len(cols) == 0:
        raise ValueError(
            f"{path}: AUCUN pixel opaque dans la bande Socle post-décalage [{row_top},{row_bot}) — "
            "marge basse mesurée trop grande pour ce script (cas non couvert)"
        )
    xmin, xmax = int(cols.min()), int(cols.max())
    width = xmax - xmin + 1
    center_offset = (xmin + xmax) / 2.0 - w / 2.0
    return w, h, width, center_offset, bottom_margin_px


def main():
    print(f"{'slot':<14} {'sprite':<10} {'widthPx':>8} {'centerOffsetPx':>15} {'bottomMarginPx':>15}")
    for name, path in FILES.items():
        w, h, width, offset, margin = measure(path)
        print(f"{name:<14} {w}x{h:<6} {width:>8} {offset:>15.1f} {margin:>15}")


if __name__ == "__main__":
    main()
