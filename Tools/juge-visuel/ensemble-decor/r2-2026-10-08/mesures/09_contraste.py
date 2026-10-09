#!/usr/bin/env python3
"""09 — CONTRASTE WCAG encre/fond des petits textes du JEU.
Doctrine du dossier : >= 3:1 grands textes, >= 4,5:1 petits ; l'atelier tient une garde à
4,5:1 sur les 152 cadres, donc les maquettes sont au vert ⇒ un texte sous le seuil DANS LE
JEU est un écart.

Fond = couleur modale de la fenêtre (quantifiée par 8). Encre = médiane des pixels s'en
écartant de plus de 45/255. On ne retient une fenêtre que si l'encre couvre 1,5 % à 45 %
des pixels (sinon ce n'est pas du texte sur un fond, et on ne conclut pas).

Contrôle positif : un texte dont l'œil dit qu'il est franc (le titre d'or « EN COMMANDER »
de ㉚, mesuré à 6,9:1 par le script 06) doit ressortir bien au-dessus de 4,5.
Contrôle négatif : un gris pâle sur fond pâle doit tomber sous 4,5 ; si RIEN ne tombe
jamais sous le seuil, l'instrument ne discrimine pas."""
from PIL import Image
import os, statistics, collections

CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"
REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"

def lin(v):
    v /= 255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4
def L(c): return 0.2126*lin(c[0]) + 0.7152*lin(c[1]) + 0.0722*lin(c[2])
def ratio(a, b):
    la, lb = L(a), L(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def mes(base, f, box, quoi):
    im = Image.open(os.path.join(base, f)).convert("RGB"); px = im.load()
    x0, y0, x1, y1 = box
    pts = [px[x, y] for y in range(y0, y1) for x in range(x0, x1)]
    q = collections.Counter((p[0]//8, p[1]//8, p[2]//8) for p in pts)
    fq = q.most_common(1)[0][0]
    fond = tuple(int(statistics.median([p[k] for p in pts if (p[0]//8, p[1]//8, p[2]//8) == fq])) for k in range(3))
    ink = [p for p in pts if max(abs(p[k]-fond[k]) for k in range(3)) > 45]
    part = 100*len(ink)/len(pts)
    if not (1.5 <= part <= 45):
        print(f"  {quoi:52s} {im.size[0]}x{im.size[1]}  encre={part:4.1f}% -> fenêtre non concluante")
        return None
    encre = tuple(int(statistics.median([p[k] for p in ink])) for k in range(3))
    r = ratio(encre, fond)
    print(f"  {quoi:52s} {im.size[0]}x{im.size[1]}  fond={str(fond):16s} encre={str(encre):16s}"
          f" encre={part:4.1f}%  contraste={r:4.2f}:1 {'  << SOUS 4,5' if r < 4.5 else ''}")
    return r

print("=== petits textes du JEU ===")
CAS = [
 (CAP, "E11_DecisionDetail_1080x2400.png", (70, 1862, 1010, 1902),  "⑤ E11  « Tactique — trancher ne touche pas… » sur feutre"),
 (CAP, "E06_Dmolition_1080x2400.png",      (930, 1212, 1015, 1252), "㉝ E06  « libre » (statut de site)"),
 (CAP, "E06_Dmolition_1080x2400.png",      (80, 1240, 900, 1275),   "㉝ E06  sous-ligne de site « La Lisière, îlot 1502 · … »"),
 (CAP, "E07_Boutique_1080x2400.png",       (175, 1998, 295, 2032),  "㉓ E07  « Bientôt »"),
 (CAP, "E10_Filire_1080x2400.png",         (300, 2068, 790, 2104),  "㊵ E10  « l'argent passe de la planque à la filière »"),
 (CAP, "E02_Carnet_1080x2400.png",         (520, 1990, 955, 2026),  "㉞ E02  « une fois partie, on ne la reprend pas »"),
 (CAP, "E04_Distribution_1080x2400.png",   (55, 615, 965, 850),     "㉘ E04  sous-titre bleu-gris sur fond brun"),
 (CAP, "E05_Loi_1080x2400.png",            (55, 1678, 775, 1722),   "㉛ E05  « Une affaire naît d'une descente — … »"),
 (CAP, "E08_Lasemaine_1080x2400.png",      (255, 1508, 825, 1552),  "⑭ E08  « TENSION CALME · AUCUNE SEMAINE »"),
 (CAP, "E09_Inspections_1080x2400.png",    (130, 545, 955, 600),    "⑮ E09  « 18 DISTRICTS · TOUT OU RIEN … »"),
 (CAP, "E03_Chanedappro_1080x2400.png",    (50, 1995, 1030, 2090),  "㉚ E03  barre « EN COMMANDER » (contrôle positif)"),
 (CAP, "E01_Journal_1080x2400.png",        (95, 1930, 985, 2010),   "㊳ E01  « Y PRÊTER ATTENTION » (état désactivé)"),
]
res = []
for b, f, box, q in CAS:
    r = mes(b, f, box, q)
    if r: res.append((q, r))

print("\n=== le MÊME endroit dans la maquette, là où elle en a un (témoin) ===")
mes(REF, "E11-cadre-04-la-carte-distribuee.png", (70, 1780, 1010, 1820), "⑤ réf   ligne sous la carte, sur feutre")
mes(REF, "E08-cadre-18-au-calme.png", (120, 1600, 960, 1650), "⑭ réf   « CALME — VOS AFFAIRES RESPIRENT »")
mes(REF, "E09-cadre-31-tableau.png", (40, 2050, 1040, 2095), "⑮ réf   pied « Quatre d'entre eux vous chassent »")

print("\n=== contrôles ===")
bas = [q for q, r in res if r < 4.5]
print(f"sous 4,5:1 : {len(bas)} fenêtre(s) sur {len(res)} concluantes")
for q in bas: print("   -", q)
print("l'instrument discrimine (il trouve du haut ET du bas) :",
      "OUI" if res and max(r for _, r in res) > 6 and min(r for _, r in res) < 4.5 else "NON")
