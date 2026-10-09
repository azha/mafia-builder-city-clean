#!/usr/bin/env python3
"""00 — Contrôle d'intégrité du dossier AVANT toute mesure.

- recalcule sha256[:12] des 33 captures et les confronte à la table de dossier.md
- imprime la taille de CHAQUE image ouverte (captures + références)
- contrôle positif : les 48 références doivent TOUTES faire 1080x2102 (dossier.md §Échelle)
- contrôle négatif : une empreinte volontairement fausse doit être signalée ECART
"""
import hashlib, os, sys
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r4-2026-10-09"
CAP = os.path.join(D, "captures")
REF = os.path.join(D, "reference")

ATTENDU = {
 "A01_AccueilFile2Cartes_1080x1920": "54d32415bc2f",
 "A01_AccueilFile2Cartes_1080x2400": "9d684464a720",
 "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x1920": "61c22d40adc7",
 "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400": "54f7a48092fc",
 "A01_AccueilFile2Cartes_TeteNonRapports_1080x1920": "b52b2e76e095",
 "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400": "7bbca2203b01",
 "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920": "beb14c00ab64",
 "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400": "2c385c46cdb5",
 "E01_Journal_1080x1920": "d2ecd89cd491",
 "E01_Journal_1080x2400": "bdd1611bb59c",
 "E01_Journal_bas_1080x1920": "52403b42fb16",
 "E01_Journal_bas_1080x2400": "ae3bd7a5f242",
 "E02_Carnet_1080x1920": "930d9059fed8",
 "E02_Carnet_1080x2400": "13de20f78a75",
 "E02_Carnet_bas_1080x1920": "a7de6d521eb4",
 "E02_Carnet_bas_1080x2400": "45959a90f17e",
 "E03_Chanedappro_1080x1920": "74b5186d191a",
 "E03_Chanedappro_1080x2400": "6030ad262b04",
 "E04_Distribution_1080x1920": "c0f2ab17f1ed",
 "E04_Distribution_1080x2400": "67c3dd012ffe",
 "E05_Loi_1080x1920": "4ba05417d31d",
 "E05_Loi_1080x2400": "52f7afa9f99d",
 "E05_Loi_bas_1080x1920": "07a6ea0e3a4a",
 "E06_Dmolition_1080x1920": "3bf279d99163",
 "E06_Dmolition_1080x2400": "5b6538449adb",
 "E06_Dmolition_bas_1080x1920": "7e636f0c3674",
 "E08_Lasemaine_1080x1920": "de31c16b1a57",
 "E08_Lasemaine_1080x2400": "3bcb07477e63",
 "E08_Lasemaine_bas_1080x1920": "825ecafc44a1",
 "E10_Filire_1080x1920": "2287739205bb",
 "E10_Filire_1080x2400": "6b31161ba245",
 "E11_DecisionDetail_1080x1920": "067d6a2c56ac",
 "E11_DecisionDetail_1080x2400": "866d416afabb",
}

def sha12(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()[:12]

print("=== CAPTURES (nom | taille PIL | sha256[:12] | attendu | verdict) ===")
ko = 0
caps = sorted(os.listdir(CAP))
print("nb fichiers captures/ =", len(caps))
for n in caps:
    p = os.path.join(CAP, n)
    stem = n[:-4]
    with Image.open(p) as im:
        taille = im.size
    got = sha12(p)
    att = ATTENDU.get(stem, "<ABSENT DE LA TABLE>")
    v = "OK" if got == att else "ECART"
    if v == "ECART":
        ko += 1
    # taille attendue déduite du NOM du fichier (contrôle croisé nom/pixels)
    wh = stem.split("_")[-1]
    tn = tuple(int(x) for x in wh.split("x"))
    vt = "OK" if taille == tn else "ECART-TAILLE"
    print(f"{stem:52s} {str(taille):12s} {got} {att} {v} nom/pixels={vt}")

print()
print("=== REFERENCES (nom | taille PIL) ===")
refs = sorted(os.listdir(REF))
print("nb fichiers reference/ =", len(refs))
tailles = {}
for n in refs:
    with Image.open(os.path.join(REF, n)) as im:
        tailles.setdefault(im.size, []).append(n)
for t, l in sorted(tailles.items()):
    print(f"  {t}: {len(l)} fichiers")
    if t != (1080, 2102):
        for n in l:
            print("     !!! HORS GABARIT:", n)

print()
print("=== CONTROLE POSITIF : toutes les refs a 1080x2102 ? ===")
print("  ->", "OUI" if list(tailles) == [(1080, 2102)] else "NON")
print("=== CONTROLE NEGATIF : empreinte bidon sur E01_Journal_1080x1920 ===")
faux = sha12(os.path.join(CAP, "E01_Journal_1080x1920.png"))
print("   compare a 'deadbeefcafe' ->",
      "ECART detecte (instrument discrimine)" if faux != "deadbeefcafe" else "PAS DISCRIMINANT")
print()
print("TOTAL empreintes en ecart :", ko)
sys.exit(0)
