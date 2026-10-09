#!/usr/bin/env python3
"""P2 (suite) — grain du liege : periode des pois et amplitude pois/fond, sur des fenetres
VERIFIEES pures liege (aucune fiche, aucune ficelle, >= 3 px de tout bord).

periode   : moyenne des ecarts entre minima locaux du profil de luminance horizontal moyenne
amplitude : p95 - p5 de la luminance dans la fenetre (contraste du pois sur son fond)
couleur   : mediane RGB de la fenetre

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : deux fenetres DISJOINTES de la meme image doivent rendre la meme periode.
Controle negatif : une fenetre prise dans la fiche creme doit rendre une amplitude ~0 et aucune periode.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def grain(im, box):
    c = im.crop(box)
    W, H = c.size
    px = list(c.getdata())
    L = [sum(p) / 3.0 for p in px]
    Ls = sorted(L)
    n = len(L)
    p5, p95 = Ls[int(.05 * n)], Ls[int(.95 * n)]
    # profil horizontal moyen
    prof = [sum(L[y * W + x] for y in range(H)) / H for x in range(W)]
    mn = sum(prof) / W
    mins = [x for x in range(1, W - 1) if prof[x] < prof[x - 1] and prof[x] <= prof[x + 1] and prof[x] < mn]
    # fusionne les minima voisins (< 5 px)
    g, last = [], -99
    for x in mins:
        if x - last > 5:
            g.append(x)
        last = x
    per = [g[i + 1] - g[i] for i in range(len(g) - 1)]
    per = [p for p in per if p > 5]
    (m, _) = med(im, *box)
    return dict(n=n, med=m, p5=round(p5, 1), p95=round(p95, 1), amp=round(p95 - p5, 1),
                nmin=len(g), per=(round(sum(per) / len(per), 1) if per else None),
                per_css=(round(sum(per) / len(per) / K, 2) if per else None))

CAS = [
    ("ref", "E04-cadre-54", (860, 880, 1040, 1060), "liege droite, au-dessus de la 2e fiche"),
    ("ref", "E04-cadre-54", (120, 940, 260, 1120), "liege gauche, sous la 1re fiche"),
    ("ref", "E04-cadre-55", (860, 880, 1040, 1060), "liege droite"),
    ("ref", "E04-cadre-56", (860, 880, 1040, 1060), "liege droite"),
    ("ref", "E04-cadre-57", (860, 880, 1040, 1060), "liege droite"),
    ("ref", "E04-cadre-58", (860, 880, 1040, 1060), "liege droite"),
    ("cap", "E04_Distribution_1080x2400", (300, 870, 480, 1050), "liege sous la fiche"),
    ("cap", "E04_Distribution_1080x2400", (700, 870, 880, 1050), "liege droite"),
    ("cap", "E04_Distribution_1080x1920", (300, 870, 480, 1050), "liege sous la fiche"),
]
print("=== P2 : grain du liege ===")
for kind, nom, box, quoi in CAS:
    im = ouvrir(kind, nom)
    d = grain(im, box)
    print(f"   {nom:30s} {str(box):26s} {quoi}")
    print(f"      mediane RGB={d['med']}  amplitude={d['amp']}/255 (p5={d['p5']} p95={d['p95']})  "
          f"pois: {d['nmin']} minima, periode={d['per']}px = {d['per_css']} css")

print()
print("=== CONTROLE NEGATIF : fenetre dans la fiche creme (doit rendre amplitude ~0) ===")
im = ouvrir("ref", "E04-cadre-54")
d = grain(im, (300, 700, 420, 740))
print("   ref fiche :", d['med'], "amplitude=", d['amp'], "minima=", d['nmin'])
im = ouvrir("cap", "E04_Distribution_1080x2400")
d = grain(im, (300, 780, 420, 810))
print("   cap fiche :", d['med'], "amplitude=", d['amp'], "minima=", d['nmin'])
