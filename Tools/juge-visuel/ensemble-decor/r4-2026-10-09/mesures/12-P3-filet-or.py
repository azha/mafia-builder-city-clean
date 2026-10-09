#!/usr/bin/env python3
"""P3 — E08 ⑭ : le filet d'or pleine largeur entre la scene et le corps.
   present ? couleur, epaisseur, largeur — contre le cadre 18 « au calme ».

Methode : on cherche, dans la zone de jonction scene/corps, la rangee la plus doree
(critere : R > B + 40 et R > 120, compte sur la largeur) ; puis on remonte/descend tant que
la rangee reste doree -> EPAISSEUR. La LARGEUR est le nombre de colonnes dorees de cette rangee,
et ses bornes x disent si le filet est pleine largeur.
Couleur : mediane RGB de la rangee centrale du filet, hors 40 px de chaque bord (frange).

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : le meme detecteur doit trouver le filet dans le cadre 18 ET dans les cadres 14-17/19.
Controle negatif : applique a une rangee de ciel (y=300), il doit compter 0 colonne doree.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def doree(p):
    return p[0] > 120 and p[0] - p[2] > 40

def scan(im, y0, y1):
    W = im.width
    best, bn = None, -1
    cnt = {}
    for y in range(y0, y1):
        n = sum(1 for x in range(W) if doree(im.getpixel((x, y))))
        cnt[y] = n
        if n > bn:
            bn, best = n, y
    # epaisseur : rangees contigues a >= 50 % du max
    a = b = best
    while a - 1 >= y0 and cnt[a - 1] >= 0.5 * bn:
        a -= 1
    while b + 1 < y1 and cnt[b + 1] >= 0.5 * bn:
        b += 1
    xs = [x for x in range(W) if doree(im.getpixel((x, best)))]
    seg = [im.getpixel((x, best)) for x in range(40, W - 40)]
    m = tuple(sorted(s[c] for s in seg)[len(seg) // 2] for c in range(3))
    return dict(y=best, n=bn, ep=b - a + 1, ya=a, yb=b,
                x0=(xs[0] if xs else None), x1=(xs[-1] if xs else None), med=m,
                prof={k: v for k, v in cnt.items() if v > 0})

CAS = [
    ("ref", "E08-cadre-18-au-calme",       1090, 1180),
    ("ref", "E08-cadre-14-semaine-sannonce", 1090, 1180),
    ("ref", "E08-cadre-17-semaine-close",  1090, 1180),
    ("cap", "E08_Lasemaine_1080x2400",      810,  900),
    ("cap", "E08_Lasemaine_1080x1920",      700,  800),
]
print("=== P3 : le filet d'or entre la scene et le corps ===")
for kind, nom, y0, y1 in CAS:
    im = ouvrir(kind, nom)
    d = scan(im, y0, y1)
    print(f"   {nom:34s} rangee la plus doree y={d['y']}  colonnes dorees={d['n']}/1080 "
          f"({100*d['n']/1080:.1f} %)  x={d['x0']}..{d['x1']}  epaisseur={d['ep']}px "
          f"= {d['ep']/K:.2f} css  RGB median={d['med']}")

print()
print("=== CONTROLE NEGATIF : rangee de ciel (y=300) ===")
for kind, nom in (("ref", "E08-cadre-18-au-calme"), ("cap", "E08_Lasemaine_1080x2400")):
    im = ouvrir(kind, nom)
    n = sum(1 for x in range(1080) if doree(im.getpixel((x, 300))))
    print(f"   {nom}: colonnes dorees a y=300 = {n} (attendu 0)")

print()
print("=== detail : profil des colonnes dorees autour du filet ===")
for kind, nom, y0, y1 in (("ref", "E08-cadre-18-au-calme", 1120, 1145), ("cap", "E08_Lasemaine_1080x2400", 835, 860)):
    im = ouvrir(kind, nom)
    print(f"   {nom}")
    for y in range(y0, y1):
        xs = [x for x in range(1080) if doree(im.getpixel((x, y)))]
        if xs:
            seg = [im.getpixel((x, y)) for x in range(40, 1040)]
            m = tuple(sorted(s[c] for s in seg)[len(seg) // 2] for c in range(3))
            print(f"      y={y}  n={len(xs):4d}  x={xs[0]}..{xs[-1]}  median={m}")
