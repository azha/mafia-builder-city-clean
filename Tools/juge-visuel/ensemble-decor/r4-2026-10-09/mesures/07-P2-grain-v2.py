#!/usr/bin/env python3
"""P2 (v2) — grain + couleur du liege, sur des fenetres BORNEES par le profil vertical mesure
en 06 (ref liege y=647..1225 ; capture 2400 liege y=909..1131 ; capture 1920 liege y=809..1031),
loin de toute fiche, de la ficelle et des bords (>= 20 px).

La v1 est ECARTEE : son controle negatif (fenetre dans la fiche creme) rendait amplitude=195,
donc ses fenetres de « liege » etaient contaminees. On refait avec le controle qui passe.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def grain(im, box):
    c = im.crop(box)
    W, H = c.size
    L = [sum(p) / 3.0 for p in c.getdata()]
    Ls = sorted(L); n = len(L)
    p5, p95 = Ls[int(.05 * n)], Ls[int(.95 * n)]
    prof = [sum(L[y * W + x] for y in range(H)) / H for x in range(W)]
    mn = sum(prof) / W
    mins = [x for x in range(1, W - 1) if prof[x] <= prof[x - 1] and prof[x] <= prof[x + 1] and prof[x] < mn]
    g, last = [], -99
    for x in mins:
        if x - last > 6:
            g.append(x)
        last = x
    per = [g[i + 1] - g[i] for i in range(len(g) - 1)]
    per = [p for p in per if 8 < p < 40]
    (m, _) = med(im, *box)
    return dict(med=m, p5=round(p5, 1), p95=round(p95, 1), amp=round(p95 - p5, 1),
                npois=len(g), per=(round(sum(per) / len(per), 2) if per else None),
                per_css=(round(sum(per) / len(per) / K, 2) if per else None))

CAS = [
    ("ref", "E04-cadre-54", (800, 900, 960, 1080)),
    ("ref", "E04-cadre-55", (800, 900, 960, 1080)),
    ("ref", "E04-cadre-56", (800, 900, 960, 1080)),
    ("ref", "E04-cadre-57", (800, 900, 960, 1080)),
    ("ref", "E04-cadre-58", (800, 900, 960, 1080)),
    ("cap", "E04_Distribution_1080x2400", (800, 940, 960, 1120)),
    ("cap", "E04_Distribution_1080x1920", (800, 840, 960, 1020)),
]
print("=== P2 v2 : liege, fenetres 160x180 px image (44,4 x 50,0 px CSS) ===")
for kind, nom, box in CAS:
    im = ouvrir(kind, nom)
    d = grain(im, box)
    vue(im, box, "liegeV2_" + nom + ".png", 2)
    print(f"   {nom:30s} {box}  mediane RGB={d['med']}  amplitude={d['amp']}/255  "
          f"pois={d['npois']} periode={d['per']}px = {d['per_css']} css")

print()
print("=== CONTROLE NEGATIF (doit passer cette fois) : fenetre PURE dans la fiche creme ===")
im = ouvrir("ref", "E04-cadre-54")
d = grain(im, (700, 1290, 860, 1330))
print("   ref fiche 2 (700,1290,860,1330) :", d['med'], "amplitude=", d['amp'], "pois=", d['npois'])
im = ouvrir("cap", "E04_Distribution_1080x2400")
d = grain(im, (700, 830, 860, 880))
print("   cap fiche   (700,830,860,880)   :", d['med'], "amplitude=", d['amp'], "pois=", d['npois'])
print("   -> amplitude attendue tres faible (aplat creme) et aucun pois periodique")
print()
print("=== CONTROLE POSITIF : 2 fenetres disjointes de la MEME capture ===")
im = ouvrir("cap", "E04_Distribution_1080x2400")
for b in ((250, 940, 410, 1120), (800, 940, 960, 1120)):
    d = grain(im, b)
    print("   ", b, d['med'], "amp=", d['amp'], "periode=", d['per'])
