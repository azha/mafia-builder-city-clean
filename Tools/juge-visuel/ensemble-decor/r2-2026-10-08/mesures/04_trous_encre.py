#!/usr/bin/env python3
"""04 — TROU mesuré sur l'ENCRE, pas sur la planéité (03 était confondu avec la matière :
la texture du liège de la maquette porte ±24/255, celle du jeu ±7 — mesuré par 03bis).

ENCRE = pixel s'écartant de plus de 40/255 de la médiane de sa ligne. 40 passe au-dessus
des deux textures de liège et reste très en dessous d'un texte ou d'une fiche.
TROU = plus longue suite de lignes contiguës portant < 0,4 % d'encre, en % de la hauteur
TOTALE de l'image.

Contrôle positif (un trou VOULU, qui DOIT sortir) : E09 cadre 33, champ de liège vide sous
la fiche ; et E10 cadre 140, dont le dossier dit que le panneau-trou est le parti pris.
Contrôle négatif (pas de trou, qui DOIT rester bas) : E09 cadre 31, six fiches punaisées ;
E08 cadre 18 et E11 cadre 04, planches pleines.
Un instrument qui ne sépare pas ces deux groupes ne mesure pas les trous."""
from PIL import Image
import os, statistics

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"
SEUIL_ENCRE = 40
SEUIL_VIDE = 0.004

def rect_utile(im):
    px = im.load(); W, H = im.size; y = H//2; x = 0
    while x < 40 and abs(px[x, y][0]-58) < 12 and abs(px[x, y][1]-67) < 12 and abs(px[x, y][2]-86) < 12:
        x += 1
    return x+3, W-1-(x+3)

def profil(im, xg, xd):
    px = im.load(); H = im.size[1]; enc = []
    for y in range(H):
        ech = [px[x, y] for x in range(xg, xd, 3)]
        med = tuple(statistics.median([c[k] for c in ech]) for k in range(3))
        n = sum(1 for c in ech if max(abs(c[k]-med[k]) for k in range(3)) > SEUIL_ENCRE)
        enc.append(n/len(ech))
    return enc

def plus_grand_trou(enc, y0, y1):
    best = cur = 0; by = 0
    for y in range(y0, y1):
        if enc[y] < SEUIL_VIDE:
            cur += 1
            if cur > best: best, by = cur, y-cur+1
        else: cur = 0
    return best, by

CAS = [
 ("réf A01",    REF, "A01-cadre-4-la-suite.png",                0.36, 0.97),
 ("jeu A01",    CAP, "A01_AccueilFile2Cartes_1080x2400.png",    0.31, 0.97),
 ("réf E01",    REF, "E01-cadre-125.png",                       0.21, 0.99),
 ("jeu E01",    CAP, "E01_Journal_1080x2400.png",               0.18, 0.97),
 ("réf E02",    REF, "E02-cadre-85.png",                        0.21, 0.99),
 ("jeu E02",    CAP, "E02_Carnet_1080x2400.png",                0.18, 0.97),
 ("réf E03",    REF, "E03-cadre-48.png",                        0.21, 0.99),
 ("jeu E03",    CAP, "E03_Chanedappro_1080x2400.png",           0.18, 0.97),
 ("réf E04",    REF, "E04-cadre-54.png",                        0.21, 0.99),
 ("jeu E04",    CAP, "E04_Distribution_1080x2400.png",          0.18, 0.97),
 ("réf E05",    REF, "E05-cadre-67.png",                        0.21, 0.99),
 ("jeu E05",    CAP, "E05_Loi_1080x2400.png",                   0.18, 0.97),
 ("réf E06",    REF, "E06-cadre-79.png",                        0.21, 0.99),
 ("jeu E06",    CAP, "E06_Dmolition_1080x2400.png",             0.18, 0.97),
 ("réf E07",    REF, "E07-cadre-98.png",                        0.21, 0.99),
 ("jeu E07",    CAP, "E07_Boutique_1080x2400.png",              0.18, 0.97),
 ("réf E08",    REF, "E08-cadre-18-au-calme.png",               0.52, 0.99),
 ("jeu E08",    CAP, "E08_Lasemaine_1080x2400.png",             0.30, 0.97),
 ("réf E09c31", REF, "E09-cadre-31-tableau.png",                0.11, 0.99),
 ("réf E09c33", REF, "E09-cadre-33-signalement.png",            0.30, 0.99),
 ("réf E09c34", REF, "E09-cadre-34-retour-de-baton.png",        0.30, 0.99),
 ("jeu E09",    CAP, "E09_Inspections_1080x2400.png",           0.09, 0.97),
 ("réf E10",    REF, "E10-cadre-140-pas-encore-de-filiere.png", 0.21, 0.99),
 ("réf E10c141",REF, "E10-cadre-141-aucune-filiere-montee.png", 0.21, 0.99),
 ("jeu E10",    CAP, "E10_Filire_1080x2400.png",                0.18, 0.97),
 ("réf E11",    REF, "E11-cadre-04-la-carte-distribuee.png",    0.33, 0.99),
 ("jeu E11",    CAP, "E11_DecisionDetail_1080x2400.png",        0.36, 0.97),
]
res = {}
for code, base, f, a, b in CAS:
    im = Image.open(os.path.join(base, f)).convert("RGB"); W, H = im.size
    xg, xd = rect_utile(im)
    enc = profil(im, xg, xd)
    n, by = plus_grand_trou(enc, int(H*a), int(H*b))
    res[code] = 100.0*n/H
    print(f"{code:11s} {W}x{H:<5d} x={xg:2d}..{xd:4d}  trou = {n:4d} px = {100.0*n/H:4.1f} % de H  (y={by}..{by+n})")

print("\n--- contrôles ---")
pos = ["réf E09c33", "réf E10"]
neg = ["réf E09c31", "réf E08", "réf E11"]
print("positifs (trou VOULU, doivent être élevés) :", {k: f"{res[k]:.1f}%" for k in pos})
print("négatifs (planches pleines, doivent être bas) :", {k: f"{res[k]:.1f}%" for k in neg})
ok = min(res[k] for k in pos) > max(res[k] for k in neg) + 5
print("l'instrument SÉPARE les deux groupes :", "OUI" if ok else "NON — ne rien conclure")
print(f"\njeu E09 = {res['jeu E09']:.1f} % contre le plus grand trou VOULU de la série "
      f"({max(res[k] for k in ['réf E09c31','réf E09c33','réf E09c34']):.1f} % sur les cadres 31/33/34 de ⑮)")
