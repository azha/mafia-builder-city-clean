#!/usr/bin/env python3
"""08 — Deux ornements du bandeau haut : le FILET d'or qui court sur toute la largeur, et
le LOSANGE d'or sous le manomètre. Question d'ENSEMBLE : qui les porte, côté maquette et
côté jeu, sur les 12 écrans ?

FILET = une ligne y où l'or occupe plus de 55 % des colonnes de deux segments LOIN du
manomètre (x 60..380 et x 700..1020). Un mot doré (« 10 000 € ») n'occupe pas 55 % des deux.
LOSANGE = une tache d'or isolée sous le disque (x 500..580, y sous le bas de l'anneau).

Contrôle positif : la maquette d'ACCUEIL (A01 cadres 4 et 5), qu'on voit porter le filet et
le losange, DOIT sortir les deux. Si elle n'en sort aucun, l'instrument ne les voit pas.
Contrôle négatif : « 10 000 € » / « 24 850 € » seuls ne doivent JAMAIS déclencher le filet."""
from PIL import Image
import os

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def est_or(c):
    r, g, b = c[:3]
    return r > 110 and r-b > 45 and b <= g+6 and g <= r+6

def analyse(path, label):
    im = Image.open(path).convert("RGB"); px = im.load(); W, H = im.size
    filets = []
    for y in range(20, 240):
        g1 = sum(1 for x in range(60, 380, 2) if est_or(px[x, y]))
        g2 = sum(1 for x in range(700, 1020, 2) if est_or(px[x, y]))
        if g1/160 > 0.55 and g2/160 > 0.55:
            filets.append(y)
    # bas de l'anneau d'or, colonne decalee
    col = W//2 - 60
    ors = [y for y in range(0, 240) if est_or(px[col, y])]
    bas = max(ors) if ors else 0
    los = []
    for y in range(bas+2, min(bas+70, H)):
        n = sum(1 for x in range(505, 575) if est_or(px[x, y]))
        if n >= 3: los.append(y)
    print(f"  {label:36s} {W}x{H}  filet: {('OUI y='+str(filets[0])+'..'+str(filets[-1])) if filets else 'non':22s}"
          f"  losange: {('OUI y='+str(los[0])+'..'+str(los[-1])) if los else 'non'}")
    return bool(filets), bool(los)

REFS = [("A01 c4","A01-cadre-4-la-suite.png"),("A01 c5","A01-cadre-5-tete-sur-ligne-haute.png"),
        ("E01","E01-cadre-125.png"),("E02","E02-cadre-85.png"),("E03","E03-cadre-48.png"),
        ("E04","E04-cadre-54.png"),("E05","E05-cadre-67.png"),("E06","E06-cadre-79.png"),
        ("E07","E07-cadre-98.png"),("E08","E08-cadre-18-au-calme.png"),
        ("E09","E09-cadre-31-tableau.png"),("E10","E10-cadre-140-pas-encore-de-filiere.png"),
        ("E11","E11-cadre-04-la-carte-distribuee.png")]
CAPS = [("A01","A01_AccueilFile2Cartes_1080x2400.png"),("E01","E01_Journal_1080x2400.png"),
        ("E02","E02_Carnet_1080x2400.png"),("E03","E03_Chanedappro_1080x2400.png"),
        ("E04","E04_Distribution_1080x2400.png"),("E05","E05_Loi_1080x2400.png"),
        ("E06","E06_Dmolition_1080x2400.png"),("E07","E07_Boutique_1080x2400.png"),
        ("E08","E08_Lasemaine_1080x2400.png"),("E09","E09_Inspections_1080x2400.png"),
        ("E10","E10_Filire_1080x2400.png"),("E11","E11_DecisionDetail_1080x2400.png")]

print("=== MAQUETTES ===")
rf = [(c, analyse(os.path.join(REF, f), c+"  "+f)) for c, f in REFS]
print("=== JEU (2400) ===")
cf = [(c, analyse(os.path.join(CAP, f), c+"  "+f)) for c, f in CAPS]

print("\n=== SYNTHÈSE ===")
rfi = [c for c, (a, b) in rf if a]; rlo = [c for c, (a, b) in rf if b]
cfi = [c for c, (a, b) in cf if a]; clo = [c for c, (a, b) in cf if b]
print(f"maquettes AVEC filet   ({len(rfi)}/13) : {rfi}")
print(f"maquettes AVEC losange ({len(rlo)}/13) : {rlo}")
print(f"jeu       AVEC filet   ({len(cfi)}/12) : {cfi}")
print(f"jeu       AVEC losange ({len(clo)}/12) : {clo}")
print("\ncontrôle positif : A01 c4 et c5 (accueil) portent-ils les deux ?",
      all(x in rfi and x in rlo for x in ("A01 c4", "A01 c5")))
