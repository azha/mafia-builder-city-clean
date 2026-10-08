#!/usr/bin/env python3
"""03 — version CORRIGÉE de 02. Deux défauts de l'instrument précédent sont réparés :
  (1) les références portent un FOND DE PAGE de l'atelier, RGB(58,67,86), en x=0..4,
      hors du corps arrondi du téléphone : il faisait lire « bord clair » sur les 12.
      ⇒ le rect utile est détecté par image, en sautant ce liseré.
  (2) le plus grand vide tombait sur la BANDE DE DÉCOR sous le bandeau (uniforme et sombre
      des deux côtés, donc pas un trou). ⇒ on part SOUS le décor.

TROU = plus longue suite de lignes contiguës sans encre : chaque ligne a < 0,5 % de pixels
qui s'écartent de plus de 14/255 de la médiane de la ligne. Mesuré en % de la HAUTEUR TOTALE
de l'image (grandeur comparable entre 2102, 2400 et 1920).

Contrôle positif : E09 cadre 33, dont le bas est un champ de liège vide VOULU par la maquette,
doit sortir un grand trou ; si l'instrument ne le voit pas, il ne mesure pas les trous.
Contrôle négatif : E09 cadre 31 (six fiches punaisées) doit sortir un trou quasi nul."""
from PIL import Image
import os, statistics

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def rect_utile(im):
    """colonne de depart : on saute le fond de page de l'atelier RGB(58,67,86)."""
    px = im.load(); W, H = im.size
    y = H//2; x = 0
    while x < 40 and abs(px[x, y][0]-58) < 12 and abs(px[x, y][1]-67) < 12 and abs(px[x, y][2]-86) < 12:
        x += 1
    return x+2, W-1-(x+2)

def trou(im, y0, y1, xg, xd):
    px = im.load(); H = im.size[1]
    vide = []
    for y in range(y0, y1):
        ech = [px[x, y] for x in range(xg, xd, 5)]
        med = tuple(statistics.median([c[k] for c in ech]) for k in range(3))
        hors = sum(1 for c in ech if max(abs(c[k]-med[k]) for k in range(3)) > 14)
        vide.append(hors / len(ech) < 0.005)
    best = cur = 0; by = 0
    for i, u in enumerate(vide):
        if u:
            cur += 1
            if cur > best: best, by = cur, y0+i-cur+1
        else: cur = 0
    return best, by, 100.0*best/H

def bord(im, y0, y1, xg, xd):
    """la matiere du contenu touche-t-elle le bord utile ? on compare la colonne de bord
    a la colonne a 6 % de la largeur : si elles sont de la MEME matiere, ca traverse."""
    px = im.load(); n = t = 0
    xm = xg + int((xd-xg)*0.06)
    for y in range(y0, y1, 5):
        a, b = px[xg, y], px[xm, y]
        n += 1
        if max(abs(a[k]-b[k]) for k in range(3)) < 18: t += 1
    return t, n

CAS = [
 # code, fichier, y_debut (fraction) = sous le decor, y_fin
 ("réf A01", REF, "A01-cadre-4-la-suite.png",                 0.36, 0.97),
 ("jeu A01", CAP, "A01_AccueilFile2Cartes_1080x2400.png",     0.31, 0.97),
 ("réf E01", REF, "E01-cadre-125.png",                        0.21, 0.99),
 ("jeu E01", CAP, "E01_Journal_1080x2400.png",                0.18, 0.97),
 ("réf E02", REF, "E02-cadre-85.png",                         0.21, 0.99),
 ("jeu E02", CAP, "E02_Carnet_1080x2400.png",                 0.18, 0.97),
 ("réf E03", REF, "E03-cadre-48.png",                         0.21, 0.99),
 ("jeu E03", CAP, "E03_Chanedappro_1080x2400.png",            0.18, 0.97),
 ("réf E04", REF, "E04-cadre-54.png",                         0.21, 0.99),
 ("jeu E04", CAP, "E04_Distribution_1080x2400.png",           0.18, 0.97),
 ("réf E05", REF, "E05-cadre-67.png",                         0.21, 0.99),
 ("jeu E05", CAP, "E05_Loi_1080x2400.png",                    0.18, 0.97),
 ("réf E06", REF, "E06-cadre-79.png",                         0.21, 0.99),
 ("jeu E06", CAP, "E06_Dmolition_1080x2400.png",              0.18, 0.97),
 ("réf E07", REF, "E07-cadre-98.png",                         0.21, 0.99),
 ("jeu E07", CAP, "E07_Boutique_1080x2400.png",               0.18, 0.97),
 ("réf E08", REF, "E08-cadre-18-au-calme.png",                0.52, 0.99),
 ("jeu E08", CAP, "E08_Lasemaine_1080x2400.png",              0.30, 0.97),
 ("réf E09c31", REF, "E09-cadre-31-tableau.png",              0.11, 0.99),
 ("réf E09c33", REF, "E09-cadre-33-signalement.png",          0.30, 0.99),
 ("jeu E09", CAP, "E09_Inspections_1080x2400.png",            0.09, 0.97),
 ("réf E10", REF, "E10-cadre-140-pas-encore-de-filiere.png",  0.21, 0.99),
 ("jeu E10", CAP, "E10_Filire_1080x2400.png",                 0.18, 0.97),
 ("réf E11", REF, "E11-cadre-04-la-carte-distribuee.png",     0.33, 0.99),
 ("jeu E11", CAP, "E11_DecisionDetail_1080x2400.png",         0.36, 0.97),
]
print(f"{'cas':10s} {'image':11s} {'rect utile':12s} {'plus grand trou':26s} bord=matière du contenu")
for code, base, f, a, b in CAS:
    im = Image.open(os.path.join(base, f)).convert("RGB"); W, H = im.size
    xg, xd = rect_utile(im)
    y0, y1 = int(H*a), int(H*b)
    n, by, pc = trou(im, y0, y1, xg, xd)
    t, tn = bord(im, y0, y1, xg, xd)
    print(f"{code:10s} {W}x{H:<5d} x={xg:2d}..{xd:4d}  trou={n:4d}px = {pc:4.1f}% de H (y={by:4d})   {t:3d}/{tn:3d} lignes")
