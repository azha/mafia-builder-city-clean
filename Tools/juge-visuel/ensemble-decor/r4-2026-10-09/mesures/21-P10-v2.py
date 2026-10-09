#!/usr/bin/env python3
"""P10 (v2) — la LIGNE DE FILE : hauteur de carte, part de vide, etiquette de gravite.

Bornes du panneau lues au FILET (RGB ~ (42,53,71)) sur la colonne x=980..1020, qui ne porte
aucun texte : reference y=1532..1825 ; capture 2400 y=1808..2103 ; capture 1920 y=1345..1635.
(Le script 20 cherchait l'etiquette a une ordonnee prise de la reference sans la ramener a
la hauteur de la capture : sa bande 2400 etait coupee — mesure refaite ici.)

part de vide : 1 - (pixels d'encre / pixels du panneau), encre = ecart > 28/255 au fond median.
Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : les 4 etats de la capture doivent rendre la MEME part de vide (meme composant).
Controle negatif : la part de vide d'un pave de fond PUR doit valoir 1,000.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def vide(im, box, seuil=28):
    px = list(im.crop(box).getdata()); n = len(px)
    fr = sorted(p[0] for p in px)[n // 2]; fg = sorted(p[1] for p in px)[n // 2]
    fb = sorted(p[2] for p in px)[n // 2]
    enc = sum(1 for p in px if (abs(p[0] - fr) + abs(p[1] - fg) + abs(p[2] - fb)) / 3 > seuil)
    return 1 - enc / n, (fr, fg, fb), n

BAND = [("ref", "A01-cadre-4-la-suite", 1532, 1825, 20, 1060),
        ("cap", "A01_AccueilFile2Cartes_1080x2400", 1808, 2103, 20, 1060),
        ("cap", "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x2400", 1808, 2103, 20, 1060),
        ("cap", "A01_AccueilFile2Cartes_TeteDeuxOptions_1080x2400", 1808, 2103, 20, 1060),
        ("cap", "A01_AccueilFile2Cartes_TeteNonRapports_1080x2400", 1808, 2103, 20, 1060),
        ("cap", "A01_AccueilFile2Cartes_1080x1920", 1345, 1635, 20, 1060)]
print("=== P10 (a) : hauteur de la ligne de file et part de vide ===")
for kind, nom, ya, yb, xa, xb in BAND:
    im = ouvrir(kind, nom)
    h = yb - ya + 1
    v, f, n = vide(im, (xa + 6, ya + 6, xb - 6, yb - 5))
    print(f"   {nom:52s} y={ya}..{yb}  hauteur={h}px = {h/K:.2f} css  "
          f"fond={f}  PART DE VIDE={v:.4f} ({100*v:.2f} %)  n={n}px")

print()
print("=== P10 (a) : etiquette de gravite ===")
ETQ = [("ref", "A01-cadre-4-la-suite", (110, 1612, 430, 1652), "LEGERE"),
       ("cap", "A01_AccueilFile2Cartes_1080x2400", (110, 1890, 430, 1935), "MODEREE"),
       ("cap", "A01_AccueilFile2Cartes_1080x1920", (110, 1428, 430, 1472), "MODEREE")]
for kind, nom, box, mot in ETQ:
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    a, b = bs[0]
    ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 3]
    hs = sorted(l[3] - l[2] + 1 for l in ls)
    ec = sorted(ls[j + 1][0] - ls[j][1] - 1 for j in range(len(ls) - 1))
    m = metrique(bits, W, a, b)
    px = [im.getpixel((box[0] + x, box[1] + y)) for y in range(a, b + 1) for x in range(W) if bits[y][x]]
    px.sort(key=lambda p: -(abs(p[0] - f[0]) + abs(p[1] - f[1]) + abs(p[2] - f[2])))
    k = max(1, len(px) // 5)
    enc = tuple(sorted(p[c] for p in px[:k])[k // 2] for c in range(3))
    print(f"   {nom:52s} « {mot} »  bande y={box[1]+a}..{box[1]+b}  {len(ls)} lettres")
    print(f"      capH median={hs[len(hs)//2]}px = {hs[len(hs)//2]/K:.2f} css   "
          f"interlettre median={ec[len(ec)//2]}px = {ec[len(ec)//2]/K:.2f} css   "
          f"encre RGB={enc} fond={f} contraste={contraste(enc, f):.2f}:1")

print()
print("=== CONTROLE NEGATIF : part de vide d'un pave de fond pur du panneau ===")
im = ouvrir("cap", "A01_AccueilFile2Cartes_1080x2400")
v, f, n = vide(im, (700, 1830, 780, 1870))
print(f"   {v:.4f} (attendu 1,0000)  fond={f}")
