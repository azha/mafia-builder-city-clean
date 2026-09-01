#!/usr/bin/env python3
"""m15 — ECART ASSUME 'compteur ENFREINTES a tiret' : verifie ses deux criteres de sortie
(couleur et position identiques aux deux autres chiffres). Compare, DANS LA CAPTURE SEULE,
le tiret de la tuile 3 aux '00' des tuiles 1 et 2 : couleur mediane de l'encre et centre y.
Repere m01. Controle positif: les tuiles 1 et 2 (deux vrais '00') doivent se ressembler entre
elles. Controle negatif: le libelle gris sous le chiffre doit sortir une couleur DIFFERENTE."""
from PIL import Image

CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
sc, left, top = 3.6, 18, 18
im = Image.open(CAP).convert("RGB"); px = im.load()
print(f"{CAP.split('/')[-1]} {im.size}")

ZONES = [
    ("tuile1 chiffre 00", (20, 66, 100, 90)),
    ("tuile2 chiffre 00", (113, 66, 193, 90)),
    ("tuile3 'ENFREINTES' chiffre", (206, 66, 280, 90)),
    ("[ctrl neg] tuile1 libelle gris", (24, 92, 96, 101)),
]
for lbl, w in ZONES:
    x0 = int(left + w[0] * sc); y0 = int(top + w[1] * sc)
    x1 = int(left + w[2] * sc); y1 = int(top + w[3] * sc)
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if sum(px[x, y][:3]) / 3 > 90]
    if not pts:
        print(f"  {lbl:32s} RIEN")
        continue
    X = [p[0] for p in pts]; Y = [p[1] for p in pts]
    med = tuple(sorted(px[p[0], p[1]][i] for p in pts)[len(pts) // 2] for i in range(3))
    print(f"  {lbl:32s} couleur={med} bbox_css=({(min(X)-left)/sc:.1f},{(min(Y)-top)/sc:.1f},"
          f"{(max(X)-left)/sc:.1f},{(max(Y)-top)/sc:.1f}) centre_y={((min(Y)+max(Y))/2-top)/sc:.1f} "
          f"centre_x={((min(X)+max(X))/2-left)/sc:.1f} aire={len(pts)/sc/sc:.1f}")
