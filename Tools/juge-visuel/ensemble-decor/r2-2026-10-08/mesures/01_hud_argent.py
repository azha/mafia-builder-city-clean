#!/usr/bin/env python3
"""01 — Le mot « ARGENT » du bandeau haut, sur les 12 maquettes et les 12 planches.
Grandeur INVARIANTE D'ÉCHELLE : largeur d'encre du mot / hauteur de capitale.
C'est l'interlettrage des capitales, que le dossier nomme comme trait d'ENSEMBLE.
Contrôle positif : la hauteur de capitale d'ARGENT doit être ~la même des deux côtés
(c'est la garde de capture du harnais, « échelle du chrome lue sur le PNG »).
Contrôle négatif : « JOUR » mesuré pareil doit donner le MÊME verdict ; si les deux mots
divergent, c'est l'instrument qui ment, pas la typo."""
from PIL import Image
import os

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def ink_bbox(im, x0, y0, x1, y1, seuil):
    """bbox des pixels dont la luminance depasse `seuil` dans la fenetre."""
    px = im.load()
    bx0 = by0 = 10**9; bx1 = by1 = -1
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = px[x, y][:3]
            if (r*299 + g*587 + b*114)//1000 > seuil:
                if x < bx0: bx0 = x
                if x > bx1: bx1 = x
                if y < by0: by0 = y
                if y > by1: by1 = y
    if bx1 < 0: return None
    return (bx0, by0, bx1, by1)

def mesure(path, label, fen_argent, fen_jour, seuil=95):
    im = Image.open(path).convert("RGB")
    print(f"  {label:34s} image {im.size[0]}x{im.size[1]}", end="  ")
    out = []
    for nom, f in (("ARGENT", fen_argent), ("JOUR", fen_jour)):
        bb = ink_bbox(im, *f, seuil)
        if bb is None:
            out.append((nom, None)); print(f"{nom}=introuvable", end=" "); continue
        w = bb[2]-bb[0]+1; h = bb[3]-bb[1]+1
        out.append((nom, (w, h, w/h)))
        print(f"{nom}: l={w:3d} h={h:2d} l/h={w/h:5.2f}", end="   ")
    print()
    return out

REFS = ["A01-cadre-4-la-suite.png","E01-cadre-125.png","E02-cadre-85.png","E03-cadre-48.png",
        "E04-cadre-54.png","E05-cadre-67.png","E06-cadre-79.png","E07-cadre-98.png",
        "E08-cadre-18-au-calme.png","E09-cadre-31-tableau.png",
        "E10-cadre-140-pas-encore-de-filiere.png","E11-cadre-04-la-carte-distribuee.png"]
CAPS = ["A01_AccueilFile2Cartes_1080x2400.png","E01_Journal_1080x2400.png","E02_Carnet_1080x2400.png",
        "E03_Chanedappro_1080x2400.png","E04_Distribution_1080x2400.png","E05_Loi_1080x2400.png",
        "E06_Dmolition_1080x2400.png","E07_Boutique_1080x2400.png","E08_Lasemaine_1080x2400.png",
        "E09_Inspections_1080x2400.png","E10_Filire_1080x2400.png","E11_DecisionDetail_1080x2400.png"]

# fenetres : ARGENT en haut a gauche, JOUR en haut a droite. Memes fenetres des deux cotes
# (les deux familles d'images font 1080 de large : x est directement comparable).
F_ARG = (30, 28, 330, 70)
F_JOUR = (780, 20, 1060, 62)

print("=== RÉFÉRENCES (1080x2102, x3,6) ===")
rr = [mesure(os.path.join(REF, f), f, F_ARG, F_JOUR) for f in REFS]
print("\n=== PLANCHES EN JEU (1080x2400, x3,6) ===")
cc = [mesure(os.path.join(CAP, f), f, F_ARG, F_JOUR) for f in CAPS]

def moy(rows, i):
    v = [r[i][1][2] for r in rows if r[i][1]]
    return sum(v)/len(v), min(v), max(v), len(v)

print("\n=== SYNTHÈSE — rapport largeur/hauteur (invariant d'échelle) ===")
for i, nom in ((0, "ARGENT"), (1, "JOUR")):
    a, amin, amax, an = moy(rr, i); b, bmin, bmax, bn = moy(cc, i)
    print(f"{nom:7s} réf  moy={a:5.2f} [{amin:.2f};{amax:.2f}] sur {an} images")
    print(f"{nom:7s} jeu  moy={b:5.2f} [{bmin:.2f};{bmax:.2f}] sur {bn} images")
    print(f"{nom:7s} ÉCART jeu/réf = {b/a:.3f}  ({(b/a-1)*100:+.1f} %)")
print("\nContrôle positif — hauteur de capitale d'ARGENT (la garde du harnais la lit) :")
hr = [r[0][1][1] for r in rr if r[0][1]]; hc = [c[0][1][1] for c in cc if c[0][1]]
print(f"  réf h={set(hr)}   jeu h={set(hc)}  -> écart max {max(hc)-min(hr)} px d'image")
