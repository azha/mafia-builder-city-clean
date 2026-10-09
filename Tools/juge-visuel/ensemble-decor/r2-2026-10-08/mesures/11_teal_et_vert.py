#!/usr/bin/env python3
"""11 — La famille TEAL de la série contre le VERT que le jeu introduit.
On prend la médiane des pixels COLORÉS (max-min > 30) d'une fenêtre, puis sa teinte HSV.
Contrôle positif : l'arc de la jauge et les compteurs doivent sortir la MÊME teinte des deux
côtés — si l'instrument ne reproduit pas ça, sa teinte ne veut rien dire."""
from PIL import Image
import colorsys, statistics
def dom(p, box, q):
    im = Image.open(p).convert("RGB"); px = im.load(); x0, y0, x1, y1 = box
    col = [c for c in (px[x, y] for y in range(y0, y1) for x in range(x0, x1))
           if max(c)-min(c) > 30 and max(c) > 60]
    if len(col) < 30:
        print(f"  {q:42s} {im.size[0]}x{im.size[1]} trop peu de pixels colorés -> non concluant"); return
    med = tuple(int(statistics.median([c[k] for c in col])) for k in range(3))
    h, s, v = colorsys.rgb_to_hsv(*[x/255 for x in med])
    print(f"  {q:42s} {im.size[0]}x{im.size[1]} RGB={med} teinte={h*360:5.1f}° sat={s:.2f}")
R = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
C = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"
print("Le TEAL de la série — contrôle positif, maquette puis jeu :")
dom(R+"E08-cadre-18-au-calme.png", (270, 1300, 390, 1480), "⑭ arc teal de la jauge (maquette)")
dom(C+"E08_Lasemaine_1080x2400.png", (270, 1030, 380, 1230), "⑭ arc teal de la jauge (jeu)")
dom(R+"E01-cadre-125.png", (150, 690, 260, 740), "㊳ chiffre des compteurs (maquette)")
dom(C+"E01_Journal_1080x2400.png", (150, 770, 260, 830), "㊳ chiffre des compteurs (jeu)")
print("\nLe VERT que le jeu introduit, sans homologue au cadre :")
dom(C+"E05_Loi_1080x2400.png", (810, 985, 990, 1030), "㉛ pastille « EN PLACE »")
dom(C+"E05_Loi_1080x2400.png", (60, 945, 1020, 1070), "㉛ cadre du panneau Commis d'office")
dom(C+"E06_Dmolition_1080x2400.png", (85, 795, 135, 855), "㉝ chiffre « 0 »")
