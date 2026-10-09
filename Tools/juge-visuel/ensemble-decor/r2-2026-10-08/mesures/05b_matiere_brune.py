#!/usr/bin/env python3
"""05b — LA MATIÈRE BRUNE, lue au PROFIL DE COULEUR (05 avait échoué : son prédicat prenait
le cadre du kraft pour le champ et annonçait « marge 0 » sur un panneau visiblement encadré).

(a) ㉘ : profil horizontal au bord du panneau. La maquette doit empiler cadre / gorge / bande /
    dégradé ; un aplat n'empile rien. On rend le PAS MAXIMAL entre deux échantillons voisins.
(b) ⑮ : amplitude de la TEXTURE du liège sur une ligne sans contenu (p50/p95/max d'écart à la
    médiane de la ligne) + la rampe de vignette.
Contrôle : les deux côtés sont lus avec le MÊME code sur la MÊME grandeur ; c'est le pas et
l'amplitude qui parlent, pas une couleur absolue."""
from PIL import Image
import statistics, os
REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def profil(path, y, label, xs=range(0, 84, 4)):
    im = Image.open(path).convert("RGB"); px = im.load()
    vals = [px[x, y] for x in xs]
    pas = max(max(abs(vals[i+1][k]-vals[i][k]) for k in range(3)) for i in range(len(vals)-1))
    print(f"  {label:34s} {im.size[0]}x{im.size[1]} y={y}")
    print(f"      {' '.join(f'{c[0]},{c[1]},{c[2]}' for c in vals[:11])}")
    print(f"      PAS MAXIMAL entre voisins = {pas}/255")
    return pas

def texture(path, y, label):
    im = Image.open(path).convert("RGB"); px = im.load()
    ech = [px[x, y] for x in range(10, 1070, 3)]
    med = tuple(statistics.median([c[k] for c in ech]) for k in range(3))
    ec = sorted(max(abs(c[k]-med[k]) for k in range(3)) for c in ech)
    print(f"  {label:34s} {im.size[0]}x{im.size[1]} y={y} médiane={med} "
          f"p50={ec[len(ec)//2]:.0f} p95={ec[int(len(ec)*.95)]:.0f} max={ec[-1]:.0f}/255"
          f"  rampe x5→x34 : {px[5,y]} → {px[34,y]}")

print("(a) ㉘ E04 — bord du panneau de kraft")
a = profil(os.path.join(REF, "E04-cadre-54.png"), 950, "maquette cadre 54")
b = profil(os.path.join(CAP, "E04_Distribution_1080x2400.png"), 1500, "jeu 2400")
print(f"      -> maquette {a}/255 contre jeu {b}/255\n")
print("(b) ⑮ E09 — grain et vignette du liège")
texture(os.path.join(REF, "E09-cadre-33-signalement.png"), 1800, "maquette cadre 33")
texture(os.path.join(CAP, "E09_Inspections_1080x2400.png"), 1500, "jeu 2400")
print("\n(c) ton de fond du kraft (contrôle positif : il doit être ÉGAL)")
for p, y, n in ((os.path.join(REF, "E04-cadre-54.png"), 950, "maquette"),
                (os.path.join(CAP, "E04_Distribution_1080x2400.png"), 1500, "jeu")):
    im = Image.open(p).convert("RGB")
    print(f"  {n:10s} champ kraft à x=300 : {im.load()[300, y]}")
