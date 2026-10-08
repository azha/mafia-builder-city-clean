"""m00 — PROVENANCE : ce sur quoi tout le reste porte.

(a) les 54 PNG de reference font-ils TOUS 1080x2102 ?
(b) les 35 empreintes sha256 du dossier correspondent-elles, une a une, aux fichiers ?
(c) les six planches E12_Dossier_* sont-elles bien exclues du jeu juge ?

CONTROLE POSITIF : une empreinte volontairement fausse doit ressortir MANQUANTE.
"""
import sys, os, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
import outils as O

print("=== m00a les 54 references ===")
tailles = {}
for f in sorted(os.listdir(O.REF)):
    if f.endswith(".png"):
        im = Image.open(os.path.join(O.REF, f))
        tailles.setdefault(im.size, []).append(f)
for k, v in tailles.items():
    print("   %s : %d fichiers" % (k, len(v)))
print("   TOTAL %d" % sum(len(v) for v in tailles.values()))

print()
print("=== m00b les 35 empreintes du dossier ===")
ATTENDU = {
    "A01_AccueilFile2Cartes_1080x2400.png": "49e107fb4746",
    "A01_AccueilFile2Cartes_1080x1920.png": "911b4fad616a",
    "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png": "7ed22aed7a4e",
    "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png": "b07f7edb4a26",
    "E01_Journal_1080x2400.png": "942c5858fa31", "E01_Journal_1080x1920.png": "26c3921f4f8a",
    "E01_Journal_bas_1080x2400.png": "6e776aae6b9c", "E01_Journal_bas_1080x1920.png": "f717bd63fa0e",
    "E02_Carnet_1080x2400.png": "e38c21ad6f5e", "E02_Carnet_1080x1920.png": "aea655dce388",
    "E02_Carnet_bas_1080x2400.png": "77dda8022e42", "E02_Carnet_bas_1080x1920.png": "e5dd0f35a136",
    "E03_Chanedappro_1080x2400.png": "4fa1addb0580", "E03_Chanedappro_1080x1920.png": "0f0d926dc5c5",
    "E04_Distribution_1080x2400.png": "361279a52055", "E04_Distribution_1080x1920.png": "043359e3de25",
    "E05_Loi_1080x2400.png": "89a432c11cf7", "E05_Loi_1080x1920.png": "e3fed1a54275",
    "E05_Loi_bas_1080x1920.png": "8e29780d2b54",
    "E06_Dmolition_1080x2400.png": "9434468bae91", "E06_Dmolition_1080x1920.png": "255bf58a7b7b",
    "E06_Dmolition_bas_1080x1920.png": "8a36069516dc",
    "E07_Boutique_1080x2400.png": "58bda1d7851b", "E07_Boutique_1080x1920.png": "80de83736d88",
    "E07_Boutique_bas_1080x2400.png": "97d10f8b972f", "E07_Boutique_bas_1080x1920.png": "3b6b8ee13d6d",
    "E08_Lasemaine_1080x2400.png": "8e31cad125c9", "E08_Lasemaine_1080x1920.png": "eb12ebcba98a",
    "E08_Lasemaine_bas_1080x1920.png": "7ab3cb8e8b99",
    "E09_Inspections_1080x2400.png": "e9386d24524c", "E09_Inspections_1080x1920.png": "3f211ec76e89",
    "E10_Filire_1080x2400.png": "5f02f99501bd", "E10_Filire_1080x1920.png": "23c17d6327e3",
    "E11_DecisionDetail_1080x2400.png": "8f877f364620", "E11_DecisionDetail_1080x1920.png": "9ddf9189a374",
}
ok = ko = 0
for f, att in sorted(ATTENDU.items()):
    h = hashlib.sha256(open(os.path.join(O.CAP, f), "rb").read()).hexdigest()[:12]
    im = Image.open(os.path.join(O.CAP, f))
    etat = "OK " if h == att else "!! "
    if h == att:
        ok += 1
    else:
        ko += 1
        print("   %s %-54s attendu %s lu %s" % (etat, f, att, h))
print("   %d empreintes verifiees, %d conformes, %d en ecart" % (len(ATTENDU), ok, ko))
print("   CONTROLE POSITIF (une empreinte volontairement fausse doit ressortir) :")
h = hashlib.sha256(open(os.path.join(O.CAP, "E01_Journal_1080x2400.png"), "rb").read()).hexdigest()[:12]
print("      E01 attendu 'deadbeefcafe' lu '%s' -> %s" % (h, "DETECTE" if h != "deadbeefcafe" else "RATE"))

print()
print("=== m00c les planches NON jugees ===")
for f in sorted(os.listdir(O.CAP)):
    if f.startswith("E12_"):
        print("   exclue (autre juge) : %s" % f)
print("   total de planches dans le repertoire : %d PNG"
      % len([f for f in os.listdir(O.CAP) if f.endswith(".png")]))
