#!/usr/bin/env python3
"""00 — tailles des images du dossier + controle positif d'echelle.

Controle positif : les 2 references doivent faire 1080x2102 (dossier.md L27).
Controle negatif : une capture 1080x2400 ne doit PAS faire 2102 de haut.
"""
import os, hashlib
from PIL import Image

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-r2"

FICHIERS = [
    (os.path.join(REF, "A01-cadre-4-la-suite.png"), "REF cadre 4"),
    (os.path.join(REF, "A01-cadre-5-tete-sur-ligne-haute.png"), "REF cadre 5"),
    (os.path.join(CAP, "A01_AccueilFile2Cartes_1080x2400.png"), "JEU court 2400"),
    (os.path.join(CAP, "A01_AccueilFile2Cartes_1080x1920.png"), "JEU court 1920"),
    (os.path.join(CAP, "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400.png"), "JEU long 2400"),
    (os.path.join(CAP, "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png"), "JEU long 1920"),
]

print("fichier".ljust(58), "taille".ljust(12), "mode".ljust(6), "sha256(12)")
for p, nom in FICHIERS:
    im = Image.open(p)
    sha = hashlib.sha256(open(p, "rb").read()).hexdigest()[:12]
    print(os.path.basename(p).ljust(58), f"{im.size[0]}x{im.size[1]}".ljust(12),
          im.mode.ljust(6), sha, "|", nom)

print()
# controle positif
ok = True
for p, nom in FICHIERS[:2]:
    s = Image.open(p).size
    print(f"CONTROLE POSITIF {nom}: 1080x2102 attendu -> {s}", "OK" if s == (1080, 2102) else "ECHEC")
    ok &= (s == (1080, 2102))
# controle negatif
s = Image.open(FICHIERS[2][0]).size
print(f"CONTROLE NEGATIF JEU court 2400 != 1080x2102 -> {s}",
      "OK (discrimine)" if s != (1080, 2102) else "ECHEC (n'discrimine pas)")
print()
print("ECHELLE declaree (dossier.md L37-41): REF 1080px/300 CSS = x3,6 ; CAP 1080px/300 CSS = x3,6")
print("=> 1 px CSS = 3,6 px image des DEUX cotes ; rapport X = 1,000 ; AUCUN rapport en Y.")
