#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
hud-topbar-probe.py — le juge de RESSEMBLANCE du TopBar (HUD v3.1 boucle ⊥ pixel-perfect, 2026-08-21).

POURQUOI PAS resemblance-probe.py (le juge du fond pré-rendu, même chantier). Ce dernier mesure une
TRANSPORT (le fond EST l'artefact, tout écart est un échec de pipeline). Ici le problème est
DIFFÉRENT : deux rendus d'un MÊME design par deux MOTEURS distincts (Chrome/CSS vs Unity/uGUI), avec
deux polices différentes (Noto Serif — "serif" générique résolu par Chrome sur cette machine — vs
DejaVu Serif SDF) — un diff plein-cadre pixel-à-pixel n'aurait aucun sens.

DEUX RÉFUTATIONS QUI ONT FORMÉ LA MÉTHODE (dans l'ordre où elles sont tombées) :

1er jet : « couleur DOMINANTE d'une boîte ». RÉFUTÉ par contrôle négatif Chrome-contre-Chrome —
pour un texte fin, le fond occupe presque toujours plus de pixels que le texte ; 6/10 régions
rendaient le fond comme "dominant".

2e jet : « localiser UNE FOIS sur la référence, réutiliser la MÊME coordonnée (x,y) sur la capture ».
RÉFUTÉ au premier run Unity réel : les DEUX moteurs rendent la même DOCTRINE (tokens identiques,
positions ancrées identiques en intention) mais PAS au pixel près — métrique de glyphe différente
(DejaVu Serif vs Noto Serif), arrondi de layout différent. Mesuré : le montant `$` était localisé à
(38,44) sur la référence, la couleur EXACTE existait dans la capture Unity à (60,56) — un delta de
position de (+22,+12), pas un delta de COULEUR. Comparer au point de la référence dans la capture
aurait comparé du texte à du FOND, un faux rouge sur un rendu par ailleurs correct.

MÉTHODE RETENUE (3e jet) : chaque image est sondée INDÉPENDAMMENT — le pixel le plus proche du hex
canon ATTENDU est cherché dans SA PROPRE boîte de recherche (généreuse), sur RÉFÉRENCE et CAPTURE
séparément. Le `locate_dist` de chaque recherche dit si un exemplaire CRÉDIBLE de la couleur a
vraiment été trouvé (proche de 0) ou si la recherche est retombée sur autre chose faute de mieux
(loin de 0 — c'est le signal qu'un élément est ABSENT ou mal coloré, pas seulement déplacé). Le
delta rapporté est celui ENTRE LES DEUX MEILLEURES TROUVAILLES — la comparaison reste
référence-vs-capture, jamais contre le hex lui-même.

SEUIL. `DELTA_MAX` distance euclidienne RGB (0..441). Contrôle négatif Chrome-contre-Chrome :
10/10 régions à delta=0.00, locate_dist=0.00 (le hex canon existe littéralement dans le rendu CSS —
attendu, ce sont les MÊMES valeurs). `LOCATE_DIST_MAX` sépare "élément trouvé" de "élément absent" —
dérivé du même contrôle : sur un rendu SAIN, `locate_dist` doit être proche de 0 pour les couleurs
FLAT (texte, filet). Une valeur élevée sur la capture, seule, signale un problème de PRÉSENCE/TEINTE
avant même de comparer les deux rendus.

CODES DE SORTIE — « aucun échec » et « aucune exécution » sont DISTINCTS :
  0 = toutes les régions FLAT comparées sont sous le seuil (et localisées des deux côtés)
  1 = au moins une région FLAT au-dessus du seuil, ou non localisée d'un côté
  2 = n'a pas pu s'exécuter (fichier absent, 0 région comparée)
"""

import argparse
import sys

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("hud-topbar-probe: PIL absent — impossible d'exécuter.\n")
    sys.exit(2)

DELTA_MAX = 20.0        # distance euclidienne RGB entre les deux meilleures trouvailles
LOCATE_DIST_MAX = 20.0  # distance euclidienne RGB entre la trouvaille et le hex canon — au-delà,
                         # "trouvé" est un faux positif (rien de la bonne couleur n'existe vraiment).

# (nom, box_recherche=(x0,y0,x1,y1) @2560px, hex_attendu, flat)
# Boîtes GÉNÉREUSES (pas de coordonnée fine supposée partagée entre les deux moteurs de rendu —
# voir docstring, 2e jet réfuté). `flat=True` compte pour le verdict ; `flat=False` (dégradés/
# semi-transparents) est rapporté seulement.
REGIONS = [
    ("money_label_ARGENT",  (0, 0, 400, 40),      "#b9ad92", True),
    ("money_value_dollar",  (0, 20, 500, 100),    "#f2c96b", True),
    ("money_underline_or",  (0, 60, 400, 100),    "#d9ab4e", True),
    ("gauge_ring_top",      (1150, 0, 1410, 40),  "#b08d3e", True),
    ("gauge_ring_bottom",   (1150, 70, 1410, 110), "#b08d3e", True),
    ("gauge_value_text",    (1150, 40, 1410, 100), "#eae0c8", True),
    ("clock_label_JOUR",    (2100, 0, 2544, 44),  "#b9ad92", True),
    ("clock_value_time",    (2100, 40, 2544, 100), "#eae0c8", True),
    ("bar_glass_top",       (900, 4, 1400, 10),   "#0b111b", False),
    ("bar_glass_lower",     (900, 90, 1400, 98),  "#0d131e", False),
]


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a[:3], b[:3])) ** 0.5


def find_nearest_pixel(im, box, target_rgb):
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(im.size[0], x1), min(im.size[1], y1)
    best = None
    px = im.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            d = rgb_distance(c, target_rgb)
            if best is None or d < best[3]:
                best = (x, y, c, d)
    return best


def run(reference_path, capture_path):
    ref = Image.open(reference_path).convert("RGB")
    cap = Image.open(capture_path).convert("RGB")

    rows = []
    for name, box, hexnote, flat in REGIONS:
        target = hex_to_rgb(hexnote)
        rfound = find_nearest_pixel(ref, box, target)
        cfound = find_nearest_pixel(cap, box, target)
        rows.append((name, flat, rfound, cfound))

    hdr = f"{'région':24s} {'flat':>5s} {'réf(x,y)':>12s} {'réf.color':>16s} {'réf.ldist':>9s} " \
          f"{'cap(x,y)':>12s} {'cap.color':>16s} {'cap.ldist':>9s} {'delta':>7s}  statut"
    print(hdr)
    n_flat = 0
    n_over = 0
    for name, flat, rfound, cfound in rows:
        if rfound is None or cfound is None:
            print(f"{name:24s} {str(flat):>5s}  HORS CADRE (boîte de recherche invalide)")
            if flat:
                n_flat += 1
                n_over += 1
            continue
        rx, ry, rc, rld = rfound
        cx, cy, cc, cld = cfound
        dist = rgb_distance(rc, cc)
        located_both = rld <= LOCATE_DIST_MAX and cld <= LOCATE_DIST_MAX
        status = "OK" if (not flat or (located_both and dist <= DELTA_MAX)) else "ROUGE"
        if flat:
            n_flat += 1
            if status == "ROUGE":
                n_over += 1
        print(f"{name:24s} {str(flat):>5s} {str((rx,ry)):>12s} {str(rc):>16s} {rld:>9.2f} "
              f"{str((cx,cy)):>12s} {str(cc):>16s} {cld:>9.2f} {dist:>7.2f}  {status}")

    if n_flat == 0:
        print("AUCUNE région FLAT comparée — configuration cassée, pas un jugement.")
        return 2

    print(f"\n{n_flat - n_over}/{n_flat} régions FLAT sous le seuil (DELTA_MAX={DELTA_MAX}, "
          f"LOCATE_DIST_MAX={LOCATE_DIST_MAX})")
    return 1 if n_over > 0 else 0


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--reference", required=True)
    p.add_argument("--capture", required=True)
    args = p.parse_args()
    sys.exit(run(args.reference, args.capture))


if __name__ == "__main__":
    main()
