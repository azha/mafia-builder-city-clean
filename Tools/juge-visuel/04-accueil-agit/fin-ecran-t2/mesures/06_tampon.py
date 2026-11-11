#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""06 — LE TAMPON « TRANCHÉE » : bbox de l'encre rouge, taille relative a la carte, angle du cadre
du tampon, et DEBORD par rapport aux bords de la carte (reference : le tampon sort de la carte a
GAUCHE — c'est ce qui lui donne l'air « pose a cheval »).

Detecteur rouge sombre : r-g > 45 et r-b > 45 et 70 < r < 200.
Contrôles :
  POSITIF — le losange ♦ et le mot TACTIQUE sont du MEME rouge : le detecteur doit les voir aussi
            (on les exclut par la zone, pas par la couleur) ; et sur cadre 7 (SANS tampon) la zone
            centrale de la carte doit rendre ~0 px rouge.
  NEGATIF — cadre 7 et G05 (pas de tampon) : aucune encre rouge dans la moitie centrale de la carte.
Repere : carte mesuree par 04 (run de papier), recopiee ici en dur et re-affichee.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6

# cartes mesurees par 04_carte_et_jeton_runs.py (x0,y0,x1,y1)
CARTES = {
    "cadre-6-apres-geste-executed.png": (112, 692, 689, 1448),
    "cadre-7-echec-1re-cible.png": (107, 809, 691, 1565),
    "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png": (104, 1062, 693, 1795),
    "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png": (104, 1159, 693, 1891),
    "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png": (100, 1127, 696, 1860),
    "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x1920.png": (104, 582, 693, 1315),
}


def est_rouge(p):
    r, g, b = p
    return (r - g) > 45 and (r - b) > 45 and 70 < r < 200


def mesure(path):
    f = os.path.basename(path)
    im = Image.open(path)
    w, h = im.size
    px = im.convert("RGB").load()
    cx0, cy0, cx1, cy1 = CARTES[f]
    ch = cy1 - cy0 + 1
    cw = cx1 - cx0 + 1
    # zone de recherche : toute la largeur d'ecran, mais seulement la MOITIE CENTRALE verticale
    # de la carte (exclut le losange/TACTIQUE en haut et PORTEE/URGENCE en bas)
    zy0 = cy0 + int(0.22 * ch)
    zy1 = cy0 + int(0.80 * ch)
    pts = []
    for y in range(zy0, zy1):
        for x in range(0, w):
            if est_rouge(px[x, y]):
                pts.append((x, y))
    print("=== %s  %dx%d" % (f, w, h))
    print("    carte (repere 04) x=[%d..%d] y=[%d..%d]  l=%d h=%d" % (cx0, cx1, cy0, cy1, cw, ch))
    print("    zone centrale examinee y=[%d..%d] ; %d px rouges" % (zy0, zy1, len(pts)))
    if len(pts) < 200:
        print("    PAS DE TAMPON (detecteur muet dans la zone centrale)")
        print()
        return
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    tx0, tx1, ty0, ty1 = min(xs), max(xs), min(ys), max(ys)
    print("    TAMPON (encre rouge) bbox x=[%d..%d] y=[%d..%d]  l=%d px (%.1f CSS)  h=%d px (%.1f CSS)" %
          (tx0, tx1, ty0, ty1, tx1 - tx0 + 1, (tx1 - tx0 + 1) / ECH, ty1 - ty0 + 1, (ty1 - ty0 + 1) / ECH))
    print("    largeur tampon / largeur carte = %.3f   hauteur tampon / hauteur carte = %.3f" %
          ((tx1 - tx0 + 1) / float(cw), (ty1 - ty0 + 1) / float(ch)))
    print("    DEBORD a gauche de la carte = %+d px (%.1f CSS)   a droite = %+d px (%.1f CSS)" %
          (cx0 - tx0, (cx0 - tx0) / ECH, tx1 - cx1, (tx1 - cx1) / ECH))
    print("    centre du tampon a %.1f %% de la hauteur de la carte" %
          (100.0 * (((ty0 + ty1) / 2.0) - cy0) / ch))
    # angle : pour chaque colonne, le y MINIMAL de l'encre rouge ; regression simple sur le tiers
    # central des colonnes (le bord superieur du cadre du tampon est une droite)
    top = {}
    for (x, y) in pts:
        if x not in top or y < top[x]:
            top[x] = y
    cols = sorted(top)
    a = cols[len(cols) // 4]
    b = cols[3 * len(cols) // 4]
    pente = (top[b] - top[a]) / float(b - a)
    import math
    print("    pente du bord superieur entre x=%d et x=%d : %.4f  => angle = %.2f deg" %
          (a, b, pente, math.degrees(math.atan(pente))))
    print()


for f in ["cadre-6-apres-geste-executed.png", "cadre-7-echec-1re-cible.png"]:
    mesure(os.path.join(REF, f))
for f in ["G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x2400.png",
          "G06_ApresGeste_noted_structurelle_c3aa3bbdb_b35bdd6cb_1080x2400.png",
          "G05_ApresGeste_premiere_cible_en_echec_c3aa3bbdb_b35bdd6cb_1080x2400.png",
          "G01_ApresGeste_executed_c3aa3bbdb_b35bdd6cb_1080x1920.png"]:
    mesure(os.path.join(CAP, f))
