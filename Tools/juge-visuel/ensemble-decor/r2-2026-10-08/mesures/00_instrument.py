#!/usr/bin/env python3
"""00 — Contrôle de l'instrument : tailles + empreintes des 35 planches et des 54 références,
confrontées aux nombres ÉCRITS dans dossier.md. Un instrument qui lit un autre fichier que celui
que le dossier nomme ne mesure rien.
Contrôle positif : les 35 empreintes du dossier DOIVENT toutes matcher.
Contrôle négatif : une empreinte volontairement fausse DOIT rougir (ligne FAUX_TEMOIN)."""
import hashlib, glob, os, sys
from PIL import Image

CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"
REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"

# recopié à la main de dossier.md lignes 60-69
ATTENDU = {
 "A01_AccueilFile2Cartes_1080x2400.png":"610348b9a321","A01_AccueilFile2Cartes_1080x1920.png":"d4db7cae2ed2",
 "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png":"a4eeca6c0ff6","A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png":"9ac121ab1748",
 "E01_Journal_1080x2400.png":"c1281a587453","E01_Journal_1080x1920.png":"5134cf873f07",
 "E01_Journal_bas_1080x2400.png":"9bf17f1ccc44","E01_Journal_bas_1080x1920.png":"323c4a38d9de",
 "E02_Carnet_1080x2400.png":"286cebdaceeb","E02_Carnet_1080x1920.png":"38b844c33e44",
 "E02_Carnet_bas_1080x2400.png":"e7033163761d","E02_Carnet_bas_1080x1920.png":"2bfc4a802c57",
 "E03_Chanedappro_1080x2400.png":"edd0dc99c458","E03_Chanedappro_1080x1920.png":"09c0063e72ad",
 "E04_Distribution_1080x2400.png":"1c68da39a19a","E04_Distribution_1080x1920.png":"31e2b3ded8fa",
 "E05_Loi_1080x2400.png":"f2e54101ffd9","E05_Loi_1080x1920.png":"8a701fc7e74f","E05_Loi_bas_1080x1920.png":"9cca61b5794a",
 "E06_Dmolition_1080x2400.png":"27a2b3e06028","E06_Dmolition_1080x1920.png":"c68f6e79a507","E06_Dmolition_bas_1080x1920.png":"df3f2d8ee386",
 "E07_Boutique_1080x2400.png":"5953115e1d26","E07_Boutique_1080x1920.png":"1e30813cb649",
 "E07_Boutique_bas_1080x2400.png":"ff2094584944","E07_Boutique_bas_1080x1920.png":"257ae2858a18",
 "E08_Lasemaine_1080x2400.png":"10ea8413826b","E08_Lasemaine_1080x1920.png":"e16da2fbe276","E08_Lasemaine_bas_1080x1920.png":"5c6dfaff5e08",
 "E09_Inspections_1080x2400.png":"b54d2ea19921","E09_Inspections_1080x1920.png":"2edc88193c33",
 "E10_Filire_1080x2400.png":"23cbbaa0da98","E10_Filire_1080x1920.png":"f46d29049b6c",
 "E11_DecisionDetail_1080x2400.png":"10e68702108c","E11_DecisionDetail_1080x1920.png":"6bad676a0338",
}

ok = ko = 0
for n, h in sorted(ATTENDU.items()):
    p = os.path.join(CAP, n)
    if not os.path.exists(p):
        print("MANQUE", n); ko += 1; continue
    got = hashlib.sha256(open(p, "rb").read()).hexdigest()[:12]
    im = Image.open(p)
    tag = "OK " if got == h else "KO "
    if got == h: ok += 1
    else: ko += 1
    print(f"{tag}{n:58s} {im.size[0]}x{im.size[1]} attendu={h} lu={got}")
print(f"\n35 planches : OK={ok} KO={ko}  (dossier.md en annonce 35)")

# contrôle négatif
faux = hashlib.sha256(open(os.path.join(CAP, "E01_Journal_1080x2400.png"), "rb").read()).hexdigest()[:12]
print("FAUX_TEMOIN  E01 2400 contre l'empreinte de E02 2400 ->",
      "ROUGIT (bon)" if faux != "286cebdaceeb" else "VERT (instrument mort)")

# références
tailles = {}
fs = sorted(glob.glob(os.path.join(REF, "*.png")))
for f in fs:
    tailles.setdefault(Image.open(f).size, []).append(os.path.basename(f))
print(f"\n{len(fs)} références ; tailles distinctes :")
for s, v in tailles.items():
    print("   ", s, len(v), "fichiers")
print("dossier.md annonce : 54 PNG, tous 1080x2102, tous à x3,6")
print("hors-norme (!=1080x2102) :", [b for s, v in tailles.items() if s != (1080, 2102) for b in v] or "aucune")
