#!/usr/bin/env python3
"""P1 — sous-titre du bandeau de titre : hauteur d'x (invariante du contenu), hauteur de
capitale de la 1re lettre quand elle existe, rapport titre/sous-titre, nombre de lignes.

Ramene en px CSS : 1 px CSS = 3,6 px image, DES DEUX COTES (dossier.md §Echelle).
Tolerance du mandat sur une hauteur de capitale : <= 1 px (echelle de la reference) ou <= 5 %.

Controle positif : les 5 references doivent rendre la MEME hauteur d'x de sous-titre (meme gabarit).
Controle negatif : titre et sous-titre doivent rendre des hauteurs d'x differentes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

# (ecran, kind, nom, fenetre, index de bande du titre, nb de bandes de titre, index du sous-titre)
JEUX = [
 ("E03", "ref", "E03-cadre-48",              (40, 420, 1040, 600), [0], 1),
 ("E03", "cap", "E03_Chanedappro_1080x2400", (40, 500, 1040, 670), [0], 1),
 ("E03", "cap", "E03_Chanedappro_1080x1920", (40, 400, 1040, 570), [0], 1),
 ("E04", "ref", "E04-cadre-54",              (40, 420, 1040, 600), [0], 1),
 ("E04", "cap", "E04_Distribution_1080x2400",(40, 500, 1040, 670), [0], 1),
 ("E04", "cap", "E04_Distribution_1080x1920",(40, 400, 1040, 570), [0], 1),
 ("E05", "ref", "E05-cadre-67",              (40, 420, 1040, 600), [0], 1),
 ("E05", "cap", "E05_Loi_1080x2400",         (40, 500, 1040, 670), [0], 1),
 ("E05", "cap", "E05_Loi_1080x1920",         (40, 400, 1040, 570), [0], 1),
 ("E02", "ref", "E02-cadre-85",              (40, 420, 1040, 600), [0], 1),
 ("E02", "cap", "E02_Carnet_1080x2400",      (40, 500, 1040, 670), [0], 1),
 ("E02", "cap", "E02_Carnet_1080x1920",      (40, 400, 1040, 570), [0], 1),
 ("E06", "ref", "E06-cadre-79",              (40, 420, 1040, 600), [0], 1),
 ("E06", "cap", "E06_Dmolition_1080x2400",   (40, 500, 1040, 700), [0, 1], 2),
 ("E06", "cap", "E06_Dmolition_1080x1920",   (40, 400, 1040, 600), [0, 1], 2),
]

print("=== P1 — bandeau de titre (E06 = temoin designe par dossier.md) ===")
print("    xH / capH en px image ET en px CSS (/3,6) ; trait = mediane des segments d'encre dans la bande d'x")
tab = []
for ec, kind, nom, box, it, iss in JEUX:
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    print(f"   bandes abs = {[(box[1]+a, box[1]+b) for a, b in bs]}")
    mt = [metrique(bits, W, *bs[i]) for i in it]
    ms = metrique(bits, W, *bs[iss])
    t = mt[0]
    print(f"   {ec} {kind} {nom}")
    for j, m in enumerate(mt):
        print(f"      titre L{j+1} : xH={m['xH']:3d}px ({m['xH']/K:5.2f} css)  capH={m['capH']:3d}px "
              f"({m['capH']/K:5.2f} css) trait={m['trait']}px  encre x={box[0]+m['x0']}..{box[0]+m['x1']}")
    print(f"      ssTitre  : xH={ms['xH']:3d}px ({ms['xH']/K:5.2f} css)  capH={ms['capH']:3d}px "
          f"({ms['capH']/K:5.2f} css) trait={ms['trait']}px  encre x={box[0]+ms['x0']}..{box[0]+ms['x1']}"
          f"  lignes_titre={len(mt)}")
    tab.append((ec, kind, nom, t, ms, len(mt)))

print()
print("=== SYNTHESE P1 ===")
print(f"{'ecran':5s} {'src':3s} {'fichier':34s} {'titre xH':>9s} {'ssT xH':>7s} {'ssT capH':>9s} "
      f"{'rapport':>8s} {'traitT':>7s} {'traitS':>7s} {'lignesT':>8s}")
for ec, kind, nom, t, s, nl in tab:
    print(f"{ec:5s} {kind:3s} {nom:34s} {t['xH']:9d} {s['xH']:7d} {s['capH']:9d} "
          f"{t['xH']/s['xH']:8.3f} {t['trait']:7d} {s['trait']:7d} {nl:8d}")

print()
print("=== CONTROLE POSITIF : les 5 REFERENCES ont-elles le meme sous-titre ? ===")
refs = [(ec, s['xH'], s['capH'], s['trait']) for ec, k, n, t, s, nl in tab if k == 'ref']
for r in refs:
    print("   ", r)
print("    xH distincts :", sorted(set(r[1] for r in refs)), "| capH distincts :", sorted(set(r[2] for r in refs)))
print()
print("=== CONTROLE NEGATIF : titre != sous-titre ===")
for ec, kind, nom, t, s, nl in tab:
    print(f"   {ec} {kind}: titre xH={t['xH']} ssT xH={s['xH']} ->",
          "DISCRIMINE" if t['xH'] - s['xH'] >= 4 else "NE DISCRIMINE PAS")
