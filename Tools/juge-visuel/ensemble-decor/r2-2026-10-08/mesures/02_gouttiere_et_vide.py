#!/usr/bin/env python3
"""02 — Deux grandeurs de DOCTRINE, sur les 12 planches et les 12 maquettes.

(a) GOUTTIÈRE : « le contenu d'écran reste dans le rect du fond ; seul le chrome
    (bandeau haut, dock bas) traverse ». On lit, sur une bande horizontale prise SOUS le
    bandeau et AU-DESSUS du dock, la couleur de la colonne x=2 et celle de x=W-3, et on
    la compare au fond d'écran de cette ligne. Si le bord est la MATIÈRE du panneau
    (liège, crème…) et pas le fond, le contenu traverse.
(b) PLUS GRAND VIDE : la plus haute bande horizontale contiguë, dans la zone de contenu,
    dont chaque ligne est UNIFORME (écart-type des pixels < seuil) — en px et en % de la
    zone de contenu. C'est ce qui chiffre « un trou ».

Contrôle positif : E10, dont le dossier dit que le trou est le PARTI PRIS de la maquette
(assumé 10), doit montrer un grand vide DANS LA MAQUETTE AUSSI — sinon l'instrument
confond « trou voulu » et « trou subi ».
Contrôle négatif : E08 (planche dense, gauge + texte) doit montrer un petit vide."""
from PIL import Image
import os, statistics

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def analyse(path, label, y_haut, y_bas):
    im = Image.open(path).convert("RGB"); W, H = im.size
    px = im.load()
    y0 = int(H*y_haut); y1 = int(H*y_bas)
    # (a) bords
    bords = []
    for y in range(y0, y1, 7):
        bords.append((px[2, y], px[W-3, y]))
    # une ligne "traverse" si le bord n'est pas sombre (fond) : luminance > 60
    def lum(c): return (c[0]*299 + c[1]*587 + c[2]*114)//1000
    trav_g = sum(1 for g, d in bords if lum(g) > 60)
    trav_d = sum(1 for g, d in bords if lum(d) > 60)
    # (b) plus grand vide
    unif = []
    for y in range(y0, y1):
        ech = [px[x, y] for x in range(40, W-40, 9)]
        s = statistics.pstdev([lum(c) for c in ech])
        unif.append(s < 3.0)
    best = cur = 0; best_y = 0
    for i, u in enumerate(unif):
        if u:
            cur += 1
            if cur > best: best, best_y = cur, y0+i-cur+1
        else: cur = 0
    zone = y1-y0
    print(f"  {label:38s} {W}x{H}  bords clairs G={trav_g:3d}/{len(bords)} D={trav_d:3d}/{len(bords)}"
          f"   plus grand vide={best:4d} px = {100*best/zone:4.1f}% de la zone (y={best_y})")
    return trav_g, trav_d, len(bords), best, zone

PAIRES = [
 ("A01", "A01-cadre-4-la-suite.png", "A01_AccueilFile2Cartes_1080x2400.png"),
 ("E01", "E01-cadre-125.png", "E01_Journal_1080x2400.png"),
 ("E02", "E02-cadre-85.png", "E02_Carnet_1080x2400.png"),
 ("E03", "E03-cadre-48.png", "E03_Chanedappro_1080x2400.png"),
 ("E04", "E04-cadre-54.png", "E04_Distribution_1080x2400.png"),
 ("E05", "E05-cadre-67.png", "E05_Loi_1080x2400.png"),
 ("E06", "E06-cadre-79.png", "E06_Dmolition_1080x2400.png"),
 ("E07", "E07-cadre-98.png", "E07_Boutique_1080x2400.png"),
 ("E08", "E08-cadre-18-au-calme.png", "E08_Lasemaine_1080x2400.png"),
 ("E09", "E09-cadre-31-tableau.png", "E09_Inspections_1080x2400.png"),
 ("E10", "E10-cadre-140-pas-encore-de-filiere.png", "E10_Filire_1080x2400.png"),
 ("E11", "E11-cadre-04-la-carte-distribuee.png", "E11_DecisionDetail_1080x2400.png"),
]
# zone de contenu : sous le bandeau (~7 % de H) et au-dessus du dock (~93 % de H)
for code, r, c in PAIRES:
    print(f"{code} :")
    analyse(os.path.join(REF, r), "réf  " + r, 0.075, 0.93)
    analyse(os.path.join(CAP, c), "jeu  " + c, 0.075, 0.93)
