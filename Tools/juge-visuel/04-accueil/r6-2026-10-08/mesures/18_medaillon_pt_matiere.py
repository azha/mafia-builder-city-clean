#!/usr/bin/env python3
"""18 — medaillon (ligne de centre propre), pastille active, et MATIERE du rond de dock.

Le 17b lisait encore le filet de bandeau : ici la ligne de centre est prise AU-DESSUS
du filet (y < 130 pour la reference, y < 120 pour le jeu), et le balayage part de x=400.

CONTROLE POSITIF : le centre du medaillon doit tomber au milieu de l'image (540) des
deux cotes.
CONTROLE NEGATIF : le meme balayage une ligne SOUS le medaillon doit rendre un diametre
nettement plus petit (on sort du cercle).
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def anneau(im, y, dmin=25, rmin=60, xmin=400, xmax=700):
    px = im.load()
    xs = [x for x in range(xmin, xmax) if px[x, y][0]-px[x, y][2] >= dmin and px[x, y][0] >= rmin]
    return (min(xs), max(xs), len(xs)) if xs else None


print("=== 18a — MEDAILLON : plus grand diametre de l'anneau laiton ===")
for cle, ys in (("ref4", range(30, 130)), ("ref5", range(30, 130)),
                ("c24", range(10, 120)), ("l24", range(10, 120)),
                ("c19", range(10, 120)), ("l19", range(10, 120))):
    im = ouvrir(cle)
    best = (0, None)
    for y in ys:
        r = anneau(im, y)
        if r and (r[1]-r[0]) > best[0]:
            best = (r[1]-r[0], (y, r))
    y, (a, b, n) = best[1]
    print(f"   {cle:5s} y={y} anneau x[{a},{b}] diametre={b-a+1}px ({css(b-a+1):6.2f}CSS, "
          f"{100*(b-a+1)/im.size[0]:5.2f}% de la largeur)  centre x={(a+b)/2:.1f} (milieu=539,5)")

print()
print("   CONTROLE NEGATIF : meme balayage 30 px SOUS le bas du medaillon")
for cle, y in (("ref4", 215), ("c24", 190)):
    im = ouvrir(cle, bavard=False)
    r = anneau(im, y)
    print(f"      {cle} y={y} -> {'aucun anneau (OK)' if not r else f'diametre {r[1]-r[0]+1}px'}")

print()
print("=== 18b — pastille active (.pt) sous EMPIRE, fenetre elargie ===")
for cle, y0, y1 in (("ref4", 1985, 2045), ("ref5", 1985, 2045), ("c24", 2290, 2345),
                    ("l24", 2290, 2345), ("c19", 1810, 1865), ("l19", 1810, 1865)):
    im = ouvrir(cle, bavard=False)
    px = im.load()
    pts = [(x, y) for y in range(y0, y1) for x in range(200, 330)
           if px[x, y][0]-px[x, y][2] >= 30 and px[x, y][0] >= 70]
    if not pts:
        print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} .pt ABSENTE dans x[200,330] y[{y0},{y1}]")
        continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    print(f"   [{im.size[0]}x{im.size[1]}] {cle:5s} .pt x[{min(xs)},{max(xs)}] y[{min(ys)},{max(ys)}] "
          f"{max(xs)-min(xs)+1}x{max(ys)-min(ys)+1}px ({css(max(xs)-min(xs)+1):.1f}x{css(max(ys)-min(ys)+1):.1f} CSS) "
          f"centre x={(min(xs)+max(xs))/2:.1f}  couleur={mediane_fenetre(im,(min(xs)+max(xs))//2,(min(ys)+max(ys))//2,1)}")

print()
print("=== 18c — MATIERE du rond de dock : profil de luminance sur le diametre ===")
# centre du 1er rond : x=259 (ref) / 258,5 (jeu) ; y du centre : 1930 (ref) / 2240 / 1760
for cle, xc, yc in (("ref4", 259, 1930), ("c24", 259, 2240), ("c19", 259, 1760)):
    im = ouvrir(cle)
    px = im.load()
    prof = [round(luminance_simple(px[xc + dx, yc]), 1) for dx in range(-70, 71, 10)]
    profv = [round(luminance_simple(px[xc, yc + dy]), 1) for dy in range(-70, 71, 10)]
    dedans = luminance_simple(mediane_fenetre(im, xc, yc, 6))
    hautg = luminance_simple(mediane_fenetre(im, xc-20, yc-22, 4))
    basd = luminance_simple(mediane_fenetre(im, xc+20, yc+22, 4))
    print(f"   {cle:5s} profil H (dx=-70..+70 pas 10) : {prof}")
    print(f"         profil V (dy=-70..+70 pas 10) : {profv}")
    print(f"         centre L={dedans:5.1f}  haut-gauche L={hautg:5.1f}  bas-droite L={basd:5.1f}  "
          f"AMPLITUDE du degrade interne = {hautg-basd:+5.1f}")
