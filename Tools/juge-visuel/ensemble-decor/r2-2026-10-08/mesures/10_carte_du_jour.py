#!/usr/bin/env python3
"""10 — LA MÊME CARTE, DEUX ÉCRANS. La carte à fort levier se trancheedepuis l'Accueil (A01,
variante tête) et depuis son détail (E11 ⑤). Le geste principal y est le même geste.
Question d'ensemble : les deux écrans du JEU lui donnent-ils la même matière ?

(a) remplissage et encre du bouton, des deux côtés, dans le jeu, puis dans les maquettes.
(b) le LISERÉ D'OR en haut du tapis de feutre (maquette E11 cadre 04) : présent en jeu ?
    On balaie, colonne par colonne, la première ligne d'or rencontrée au bord haut du feutre.

Contrôle positif : la maquette A01 cadre 5 et la maquette E11 cadre 04 doivent toutes deux
rendre un bouton OR (c'est ce qu'on voit) — si l'instrument en sort un gris, il ment.
Contrôle négatif : le liseré doit être TROUVÉ dans la maquette E11 (on le voit) ; s'il n'y
est pas trouvé non plus, l'instrument ne sait pas le voir et on ne conclut rien en jeu."""
from PIL import Image
import os, statistics, collections

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def fond_encre(path, box):
    im = Image.open(path).convert("RGB"); px = im.load()
    x0, y0, x1, y1 = box
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    q = collections.Counter((p[0]//8, p[1]//8, p[2]//8) for p in pts)
    fq = q.most_common(1)[0][0]
    fond = tuple(int(statistics.median([p[k] for p in pts if (p[0]//8, p[1]//8, p[2]//8) == fq])) for k in range(3))
    ink = [p for p in pts if max(abs(p[k]-fond[k]) for k in range(3)) > 55]
    if len(ink) < 40: return im.size, fond, None
    return im.size, fond, tuple(int(statistics.median([p[k] for p in ink])) for k in range(3))

print("(a) le bouton de la carte du jour")
CAS = [
 ("maquette ⑤  E11 cadre 04",     REF, "E11-cadre-04-la-carte-distribuee.png", (60, 1905, 1020, 1990)),
 ("maquette ④  A01 cadre 5",      REF, "A01-cadre-5-tete-sur-ligne-haute.png", (100, 1150, 520, 1250)),
 ("jeu ⑤      E11 2400",          CAP, "E11_DecisionDetail_1080x2400.png",     (55, 1935, 1025, 2020)),
 ("jeu ④ tête A01 1920",          CAP, "A01_AccueilFile2Cartes_TeteRaisonLongue_1080x1920.png", (235, 1130, 845, 1200)),
]
for nom, b, f, box in CAS:
    s, fo, en = fond_encre(os.path.join(b, f), box)
    print(f"  {nom:28s} {s[0]}x{s[1]}  remplissage={str(fo):18s} encre={en}")

print("\n(b) le liseré d'or en haut du tapis de feutre de ⑤")
def lisere(path, label, yfeutre):
    im = Image.open(path).convert("RGB"); px = im.load(); W, H = im.size
    trouve = 0; ep = []
    for x in range(200, 880, 10):
        for y in range(yfeutre-40, yfeutre+70):
            c = px[x, y]
            if c[0] > 120 and c[0]-c[2] > 55 and c[2] <= c[1] <= c[0]:
                e = 0
                while y+e < H and px[x, y+e][0] > 120 and px[x, y+e][0]-px[x, y+e][2] > 55: e += 1
                trouve += 1; ep.append(e); break
    print(f"  {label:34s} {W}x{H}  or trouvé sur {trouve}/68 colonnes"
          f"{'  épaisseur médiane=' + str(int(statistics.median(ep))) + ' px' if ep else ''}")
    return trouve
a = lisere(os.path.join(REF, "E11-cadre-04-la-carte-distribuee.png"), "maquette ⑤ cadre 04", 700)
b = lisere(os.path.join(CAP, "E11_DecisionDetail_1080x2400.png"), "jeu ⑤ 2400", 880)
print(f"\ncontrôle négatif : le liseré est-il vu dans la MAQUETTE ? {'OUI' if a > 40 else 'NON — ne rien conclure en jeu'}")
