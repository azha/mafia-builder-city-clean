#!/usr/bin/env python3
"""P1 — Sous-titre du bandeau de titre : hauteur de capitale, rapport titre/sous-titre, nb de lignes.

Trois grandeurs par ligne de texte, toutes ramenees en px CSS (1 px CSS = 3,6 px image, DES DEUX COTES) :
  capH   hauteur d'encre de la 1re lettre de la ligne (majuscule a sommet plat quand le texte en offre une)
  xH     hauteur de la zone ou le profil d'encre depasse 50 % de son maximum  (= hauteur d'x, invariante
         du choix de la lettre : c'est ELLE qui compare deux lignes de contenus differents)
  trait  mediane de la longueur des segments horizontaux d'encre  (= graisse du fut)

Controle positif : E06 (temoin designe par dossier.md) ; et la LARGEUR des deux images est 1080 des deux cotes.
Controle negatif : la meme mesure sur le TITRE doit rendre un xH nettement superieur a celui du sous-titre.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seg import *

def xheight(bits, y0, y1, W):
    prof = [sum(1 for v in bits[y] if v) for y in range(y0, y1 + 1)]
    m = max(prof)
    thr = 0.5 * m
    i = prof.index(m)
    a = i
    while a > 0 and prof[a - 1] >= thr:
        a -= 1
    b = i
    while b < len(prof) - 1 and prof[b + 1] >= thr:
        b += 1
    return b - a + 1, y0 + a, y0 + b

def fiche(kind, nom, box, bandes_voulues):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    bs = [(box[1] + a, box[1] + b) for a, b in bs]
    out = []
    for etq, idx in bandes_voulues:
        ya, yb = bs[idx]
        a, b = ya - box[1], yb - box[1]
        ls = lettres(bits, W, a, b)
        l0 = ls[0]
        capH = l0[3] - l0[2] + 1
        xh, xa, xb = xheight(bits, a, b, W)
        g, n = graisse(bits, W, a, b, 0, W - 1)
        out.append(dict(etq=etq, y=(ya, yb), nlet=len(ls),
                        capH=capH, capH_css=round(capH / K, 2),
                        xH=xh, xH_css=round(xh / K, 2),
                        trait=g, nseg=n,
                        x0=box[0] + l0[0], x1=box[0] + ls[-1][1]))
    print(f"   fenetre={box} fond={f} bandes={bs}")
    for d in out:
        print(f"   {d['etq']:10s} y={d['y']} groupes={d['nlet']:3d} "
              f"capH={d['capH']:3d}px ={d['capH_css']:5.2f}cssx  "
              f"xH={d['xH']:3d}px ={d['xH_css']:5.2f}cssx  trait={d['trait']}px (n={d['nseg']}) "
              f"encre x={d['x0']}..{d['x1']}")
    return out

JEUX = {
 "E03": [("ref", "E03-cadre-48",            (40, 420, 1040, 600), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E03_Chanedappro_1080x2400", (40, 500, 1040, 670), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E03_Chanedappro_1080x1920", (40, 400, 1040, 570), [("titre", 0), ("ssTitre", 1)])],
 "E04": [("ref", "E04-cadre-54",            (40, 420, 1040, 600), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E04_Distribution_1080x2400", (40, 500, 1040, 670), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E04_Distribution_1080x1920", (40, 400, 1040, 570), [("titre", 0), ("ssTitre", 1)])],
 "E05": [("ref", "E05-cadre-67",            (40, 420, 1040, 600), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E05_Loi_1080x2400",         (40, 500, 1040, 670), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E05_Loi_1080x1920",         (40, 400, 1040, 570), [("titre", 0), ("ssTitre", 1)])],
 "E02": [("ref", "E02-cadre-85",            (40, 420, 1040, 600), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E02_Carnet_1080x2400",      (40, 500, 1040, 670), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E02_Carnet_1080x1920",      (40, 400, 1040, 570), [("titre", 0), ("ssTitre", 1)])],
 "E06": [("ref", "E06-cadre-79",            (40, 420, 1040, 600), [("titre", 0), ("ssTitre", 1)]),
         ("cap", "E06_Dmolition_1080x2400",   (40, 500, 1040, 700), [("titreL1", 0), ("titreL2", 1), ("ssTitre", 2)]),
         ("cap", "E06_Dmolition_1080x1920",   (40, 400, 1040, 600), [("titreL1", 0), ("titreL2", 1), ("ssTitre", 2)])],
}

print("=== P1 : bandeau de titre, 5 ecrans (E06 = temoin) ===")
res = {}
for ec, lst in JEUX.items():
    print(f"\n--- {ec} ---")
    res[ec] = []
    for kind, nom, box, bw in lst:
        res[ec].append((kind, nom, fiche(kind, nom, box, bw)))

print("\n=== RAPPORT titre/sous-titre (xH, invariant du contenu) ===")
for ec, lst in res.items():
    for kind, nom, d in lst:
        t = [x for x in d if x["etq"].startswith("titre")][0]
        s = [x for x in d if x["etq"] == "ssTitre"][0]
        print(f"  {ec:4s} {kind:3s} {nom:34s} titre xH={t['xH_css']:5.2f}  ssTitre xH={s['xH_css']:5.2f}  "
              f"rapport={t['xH']/s['xH']:.3f}   trait titre={t['trait']} ssTitre={s['trait']}")

print("\n=== CONTROLE NEGATIF : titre vs sous-titre doivent DIFFERER (xH) ===")
for ec, lst in res.items():
    kind, nom, d = lst[0]
    t = [x for x in d if x["etq"].startswith("titre")][0]
    s = [x for x in d if x["etq"] == "ssTitre"][0]
    print(f"  {ec} ref : titre xH={t['xH']} vs ssTitre xH={s['xH']} -> "
          + ("DISCRIMINE" if t['xH'] > s['xH'] + 3 else "NE DISCRIMINE PAS"))
