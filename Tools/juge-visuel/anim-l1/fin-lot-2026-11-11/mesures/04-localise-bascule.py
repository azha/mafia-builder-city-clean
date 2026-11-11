#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""04 — ou est l'interrupteur anime ? Boite des pixels qui CHANGENT entre
bascule-course_avant et bascule-course_t140ms (les deux etats de repos de part et d'autre
du geste, tous deux a alpha plein d'apres 03).

Controle positif : la boite doit tomber dans la moitie DROITE de l'ecran (les interrupteurs
y sont) et faire quelques dizaines de px de haut — une boite plein ecran voudrait dire que
je mesure le fondu, pas l'interrupteur.
Sortie : crops x8 des 3 interrupteurs pour lecture a l'oeil.
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
OUT = os.path.join(ICI, "crops")
os.makedirs(OUT, exist_ok=True)

a = Image.open(os.path.join(D, "bascule-course_avant_1080x2400.png")).convert("RGB")
b = Image.open(os.path.join(D, "bascule-course_t140ms_1080x2400.png")).convert("RGB")
print("avant :", a.size, " t140 :", b.size)
pa, pb = a.load(), b.load()

SEUIL = 24          # au-dessus du residu de fondu (alpha 0,982 => ~2 % d'ecart)
boites = []
for y in range(a.size[1]):
    xs = [x for x in range(a.size[0])
          if max(abs(pa[x, y][k] - pb[x, y][k]) for k in range(3)) > SEUIL]
    if xs:
        boites.append((y, min(xs), max(xs), len(xs)))

if not boites:
    print("aucun pixel change au-dessus du seuil", SEUIL)
    raise SystemExit

y0 = boites[0][0]
y1 = boites[-1][0]
x0 = min(b[1] for b in boites)
x1 = max(b[2] for b in boites)
tot = sum(b[3] for b in boites)
print(f"boite des changements : x={x0}..{x1}  y={y0}..{y1}   ({tot} px changes)")
print(f"   -> moitie droite ? x0={x0} >= 540 : {x0 >= 540}")
print(f"   -> hauteur {y1-y0+1} px, largeur {x1-x0+1} px")
print("   lignes changees (y, x0, x1, nb) — 12 premieres :")
for ligne in boites[:12]:
    print("     ", ligne)

# crops x8 autour de la boite, pour les 4 instants
mx, my = 40, 24
for n in ["bascule-course_avant_1080x2400.png", "bascule-course_t0_1080x2400.png",
          "bascule-course_t70ms_1080x2400.png", "bascule-course_t140ms_1080x2400.png"]:
    im = Image.open(os.path.join(D, n)).convert("RGB")
    c = im.crop((x0 - mx, y0 - my, x1 + mx, y1 + my))
    c = c.resize((c.size[0] * 8, c.size[1] * 8), Image.NEAREST)
    c.save(os.path.join(OUT, "bascule-" + n.split("_")[1] + ".png"))
    print(f"   crop de {n} {im.size} -> {c.size}")
print("crops dans", OUT)
