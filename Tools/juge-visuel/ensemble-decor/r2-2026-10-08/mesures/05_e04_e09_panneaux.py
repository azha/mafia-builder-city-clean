#!/usr/bin/env python3
"""05 — Géométrie des deux panneaux de matière brune (㉘ E04 kraft, ⑮ E09 liège) :
marge gauche/droite du panneau, hauteur du panneau, part VIDE du panneau, et le panneau
passe-t-il SOUS le dock. Tout en % de la largeur / hauteur de l'image, jamais en px bruts.

Le panneau est détecté par sa TEINTE : pixels bruns (r > g > b, r-b > 25, r > 60).
Contrôle positif : la maquette E04 (cadre 54) DOIT montrer une marge non nulle à gauche et
à droite (on la voit : le kraft est encadré). Si l'instrument la trouve nulle, il ment.
Contrôle négatif : la maquette E09 (cadre 31) DOIT montrer une marge NULLE (le liège va
bord à bord) — deux attendus opposés sur le même instrument."""
from PIL import Image
import os

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def brun(c):
    r, g, b = c[:3]
    return r > 60 and r > g > b and (r-b) > 25

def rect_utile(im):
    px = im.load(); W, H = im.size; y = H//2; x = 0
    while x < 40 and abs(px[x, y][0]-58) < 12 and abs(px[x, y][1]-67) < 12 and abs(px[x, y][2]-86) < 12:
        x += 1
    return x+3, W-1-(x+3)

def mesure(path, label):
    im = Image.open(path).convert("RGB"); W, H = im.size; px = im.load()
    xg, xd = rect_utile(im)
    lignes = []
    for y in range(H):
        xs = [x for x in range(xg, xd, 2) if brun(px[x, y])]
        if len(xs) > (xd-xg)/2/3:          # au moins un tiers de la ligne est brune
            lignes.append((y, min(xs), max(xs)))
    if not lignes:
        print(f"  {label:40s} {W}x{H}  aucun panneau brun"); return
    y0, y1 = lignes[0][0], lignes[-1][0]
    mg = min(l[1] for l in lignes) - xg
    md = xd - max(l[2] for l in lignes)
    haut = y1-y0+1
    print(f"  {label:40s} {W}x{H}")
    print(f"      panneau brun  y={y0}..{y1}  haut={haut} px = {100*haut/H:4.1f} % de H")
    print(f"      marge gauche={mg:3d} px = {100*mg/W:4.1f} % de W   marge droite={md:3d} px = {100*md/W:4.1f} % de W")
    print(f"      bas du panneau à {100*y1/H:5.1f} % de H")
    return y0, y1, mg, md

print("㉘ E04 — la maquette BORNE le kraft (cadre 54) :")
mesure(os.path.join(REF, "E04-cadre-54.png"), "réf E04-cadre-54.png")
print("㉘ E04 — en jeu :")
mesure(os.path.join(CAP, "E04_Distribution_1080x2400.png"), "jeu E04_Distribution_1080x2400.png")
print("\n⑮ E09 — la maquette va BORD À BORD (cadre 31) :")
mesure(os.path.join(REF, "E09-cadre-31-tableau.png"), "réf E09-cadre-31-tableau.png")
mesure(os.path.join(REF, "E09-cadre-33-signalement.png"), "réf E09-cadre-33-signalement.png")
print("⑮ E09 — en jeu :")
mesure(os.path.join(CAP, "E09_Inspections_1080x2400.png"), "jeu E09_Inspections_1080x2400.png")

print("\nOù commence le dock (planches 2400) : le gabarit place les pastilles vers y=2190,")
print("les libellés vers y=2330 ; un panneau dont le bas dépasse ~91 % de H passe dessous.")
