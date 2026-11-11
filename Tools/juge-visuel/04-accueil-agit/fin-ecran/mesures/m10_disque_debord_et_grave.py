#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m10 — le DISQUE ROUGE : (a) déborde-t-il du panneau vert ? (b) mange-t-il la ligne
« grave » (le titre de l'après-geste) ?

(a) Le haut du panneau est repéré par son LISERÉ OR (r>150, g>120, b<110, r-b>55) :
    première ligne de l'image, sous le décor, qui porte >= 400 px d'or contigu.
    On compare au haut du disque (bbox rouge vif mesurée par m05).
(b) Les lettres de la ligne grave sont des composantes connexes « or sur vert ». On
    imprime la hauteur d'encre de chacune : une lettre coupée par le disque a une
    hauteur plus courte que la médiane de ses voisines.

Contrôle positif (a) : sur cadre-6 / cadre-7 (maquette), le liseré or est trouvé au même
endroit que le haut du panneau mesuré par m04 (542 / 659).
Contrôle positif (b) : sur la MAQUETTE cadre-6, les 15 lettres de « VOUS AVEZ TRANCHÉ »
doivent avoir une hauteur quasi constante (aucun disque ne les coupe) -> ecart-type faible.
"""
import os, glob
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6


def est_or(r, g, b):
    return r >= 150 and g >= 110 and b <= 130 and r - b >= 55


def haut_panneau_or(px, w, h, depart):
    """première ligne >= depart portant une longue plage or (le liseré du panneau)."""
    for y in range(depart, h):
        cur = 0; best = 0
        for x in range(w):
            if est_or(*px[x, y]):
                cur += 1; best = max(best, cur)
            else:
                cur = 0
        if best >= 400:
            return y
    return None


def composantes_or(px, w, h, x0, y0, x1, y1):
    vus = set(); comps = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) in vus or not est_or(*px[x, y]):
                continue
            pile = [(x, y)]; vus.add((x, y))
            bx0 = bx1 = x; by0 = by1 = y; n = 0
            while pile:
                cx, cy = pile.pop(); n += 1
                bx0 = min(bx0, cx); bx1 = max(bx1, cx)
                by0 = min(by0, cy); by1 = max(by1, cy)
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if x0 <= nx <= x1 and y0 <= ny <= y1 and (nx, ny) not in vus and est_or(*px[nx, ny]):
                            vus.add((nx, ny)); pile.append((nx, ny))
            if n >= 40:
                comps.append((bx0, by0, bx1, by1, n))
    return sorted(comps)


def mediane(v):
    v = sorted(v); return v[len(v) // 2]


print("=== (a) DEBORD DU DISQUE AU-DESSUS DU LISERE OR DU PANNEAU ===")
DISQUES = {  # bbox du disque rouge, mesuree par m05 (x0,y0,x1,y1)
    "G01_2400": 611, "G02_2400": 611, "G03_2400": 611, "G04_2400": 611, "G05_2400": 611, "G06_2400": 611,
}
HAUTS = {"G01": 988, "G02": 1085, "G03": 1162, "G04": 1085, "G05": 1053, "G06": 1085}
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*2400.png"))):
    nom = os.path.basename(f)[:3]
    im = Image.open(f).convert("RGB"); px = im.load(); w, h = im.size
    print("  lu %s %dx%d" % (os.path.basename(f)[:40], w, h))
    if nom == "H01":
        print("     pas de panneau vert -> hors sujet")
        continue
    yor = haut_panneau_or(px, w, h, 300)
    yd = HAUTS[nom]
    print("     liseré or du panneau : y=%s | haut du disque rouge : y=%d | debord = %+d px = %+.1f px CSS"
          % (yor, yd, yor - yd, (yor - yd) / CSS))

print("\n  [controle positif] meme repere sur la MAQUETTE :")
for f, att in [("cadre-6-apres-geste-executed.png", 542), ("cadre-7-echec-1re-cible.png", 659)]:
    im = Image.open(os.path.join(RACINE, "reference", f)).convert("RGB"); px = im.load(); w, h = im.size
    yor = haut_panneau_or(px, w, h, 300)
    print("     %-34s %dx%d  liseré or y=%s (m04 donnait %d)" % (f, w, h, yor, att))

print("\n=== (b) LETTRES DE LA LIGNE GRAVE : une lettre coupee par le disque est plus courte ===")
BANDES = {  # (x0,y0,x1,y1) de la ligne grave, releves sur l'image
    "cadre-6": (os.path.join(RACINE, "reference", "cadre-6-apres-geste-executed.png"), 200, 585, 880, 640),
    "G01": (os.path.join(RACINE, "captures", "G01_ApresGeste_executed_cb56d837e_b35bdd6cb_1080x2400.png"), 200, 960, 880, 1015),
    "G02": (os.path.join(RACINE, "captures", "G02_ApresGeste_noted_cb56d837e_b35bdd6cb_1080x2400.png"), 300, 1057, 790, 1112),
    "G03": (os.path.join(RACINE, "captures", "G03_ApresGeste_deja_tranchee_cb56d837e_b35bdd6cb_1080x2400.png"), 180, 1134, 900, 1189),
    "G05": (os.path.join(RACINE, "captures", "G05_ApresGeste_premiere_cible_en_echec_cb56d837e_b35bdd6cb_1080x2400.png"), 100, 1025, 980, 1080),
    "G06": (os.path.join(RACINE, "captures", "G06_ApresGeste_noted_structurelle_cb56d837e_b35bdd6cb_1080x2400.png"), 300, 1057, 790, 1112),
}
for nom, (chemin, x0, y0, x1, y1) in BANDES.items():
    im = Image.open(chemin).convert("RGB"); px = im.load()
    comps = composantes_or(px, im.width, im.height, x0, y0, x1, y1)
    hs = [c[3] - c[1] + 1 for c in comps]
    if not hs:
        print("  %-8s aucune lettre trouvee" % nom); continue
    med = mediane(hs)
    courtes = [(c[0], c[3] - c[1] + 1) for c in comps if (c[3] - c[1] + 1) < 0.85 * med]
    print("  %-8s %s %dx%d | %d lettres | hauteur mediane=%d px (%.1f CSS) | min=%d max=%d"
          % (nom, os.path.basename(chemin)[:28], im.width, im.height, len(hs), med, med / CSS, min(hs), max(hs)))
    print("           hauteurs : %s" % hs)
    if courtes:
        print("           LETTRES COURTES (< 85 %% de la mediane), x de depart : %s" % courtes)
