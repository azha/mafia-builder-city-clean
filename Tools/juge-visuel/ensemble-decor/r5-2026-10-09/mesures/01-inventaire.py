#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inventaire : recalcule les 22 empreintes sha256 annoncees par dossier.md et imprime
la TAILLE des 54 images du dossier. Rien n'est mesure tant que ce script n'est pas vert.

CONTROLE POSITIF : les 22 empreintes doivent correspondre, une a une.
CONTROLE NEGATIF : aucune image ne doit faire 900x1752 (le dossier l'affirme ; si une
                   telle image apparaissait, l'echelle x3,6 serait fausse pour elle).
"""
import hashlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "00-outils.py")).read())

ATTENDU = {
    "A01_AccueilFile2Cartes_1080x1920": "63a5cfc21fa5",
    "A01_AccueilFile2Cartes_1080x2400": "250e77b16129",
    "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x1920": "bee22ffdb100",
    "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400": "5b8a7eb06382",
    "A01_AccueilFile2Cartes_TeteNonRapports_1080x1920": "6a83e8da9a1d",
    "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400": "5cf8817bf4e3",
    "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920": "967f67cbf6cf",
    "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400": "8f32c8a968fa",
    "E02_Carnet_1080x1920": "80f77dab5d2f",
    "E02_Carnet_1080x2400": "e8033be20ee1",
    "E02_Carnet_bas_1080x1920": "737a0d794ad5",
    "E02_Carnet_bas_1080x2400": "435307ab3857",
    "E03_Chanedappro_1080x1920": "24785246bf8c",
    "E03_Chanedappro_1080x2400": "ce199f0e4fb4",
    "E04_Distribution_1080x1920": "9d6f4205341d",
    "E04_Distribution_1080x2400": "dcdd3f94228b",
    "E05_Loi_1080x1920": "35e7708aaaf8",
    "E05_Loi_1080x2400": "813b79f2f374",
    "E05_Loi_bas_1080x1920": "027fef5be10e",
    "E06_Dmolition_1080x1920": "4ad4d42bda5c",
    "E06_Dmolition_1080x2400": "65b7d5a24181",
    "E06_Dmolition_bas_1080x1920": "f224cfda995b",
}


def main():
    ko = []
    print("--- CAPTURES : empreinte sha256 (12 premiers) + taille ---")
    d = DOSSIER + "captures/"
    noms = sorted(os.listdir(d))
    for n in noms:
        emp = hashlib.sha256(open(d + n, "rb").read()).hexdigest()[:12]
        cle = n[:-4]
        att = ATTENDU.get(cle)
        im = ouvrir("captures/" + n)
        etat = "OK" if att == emp else f"!! ATTENDU {att}"
        if att != emp:
            ko.append(n)
        print(f"      {cle:52s} {emp}  {etat}")
    print(f"    {len(noms)} captures ; {len(ATTENDU)} empreintes attendues ; "
          f"{len(ko)} desaccord(s) : {ko}")

    print("\n--- REFERENCES : taille (toutes doivent etre 1080x2102) ---")
    d = DOSSIER + "reference/"
    noms = sorted(os.listdir(d))
    tailles = set()
    for n in noms:
        im = ouvrir("reference/" + n)
        tailles.add(im.size)
    print(f"    {len(noms)} references ; tailles distinctes = {tailles}")
    print(f"    CONTROLE NEGATIF : (900, 1752) present ? {'OUI !!' in str((900,1752) in tailles) or ((900,1752) in tailles)}")


if __name__ == "__main__":
    main()
