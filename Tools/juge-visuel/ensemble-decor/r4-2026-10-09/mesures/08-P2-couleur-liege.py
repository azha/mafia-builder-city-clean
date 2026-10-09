#!/usr/bin/env python3
"""P2 (suite) — couleur du liege en tenant compte du DEGRADE : on ne compare pas une fenetre
a une fenetre (une fenetre prise a 20 % de largeur et une autre a 75 % ne comparent rien si le
liege est degrade), on compare le PROFIL en % de la largeur du liege.

Bornes du liege lues au profil (script 06) :
  reference      : x 43..1036   y 647..1225
  capture 2400   : x 108..971   y 909..1131
  capture 1920   : x 108..971   y 809..1031
Chaque bande = 10 % de la largeur du liege ; valeur = mediane RGB de la bande sur 60 px de hauteur
centres dans le liege, donc >= 20 px de tout bord.

Echelle : 1 px CSS = 3,6 px image des deux cotes. Tolerance d'aplat du mandat : 6/255 par canal.
Controle positif : la bande 50 % de deux cadres de reference differents doit coincider.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

CAS = [
    ("ref", "E04-cadre-54", 43, 1036, 1040, 1100),
    ("ref", "E04-cadre-57", 43, 1036, 1040, 1100),
    ("cap", "E04_Distribution_1080x2400", 108, 971, 1000, 1060),
    ("cap", "E04_Distribution_1080x1920", 108, 971,  900,  960),
]
print("=== P2 : profil de couleur du liege, par decile de largeur ===")
res = {}
for kind, nom, xa, xb, ya, yb in CAS:
    im = ouvrir(kind, nom)
    L = xb - xa + 1
    print(f"   {nom}  liege x={xa}..{xb} (L={L}px = {L/K:.1f} css)  bande y={ya}..{yb}")
    vals = []
    for i in range(10):
        x0 = xa + int(i * L / 10) + 4
        x1 = xa + int((i + 1) * L / 10) - 4
        (m, n) = med(im, x0, ya, x1, yb)
        vals.append(m)
        print(f"      {i*10:3d}-{(i+1)*10:3d} %  x={x0:4d}..{x1:4d}  RGB={m}")
    res[nom] = vals

print()
print("=== DELTA capture - reference, par decile (canal par canal) ===")
r = res["E04-cadre-54"]
for nom in ("E04_Distribution_1080x2400", "E04_Distribution_1080x1920"):
    c = res[nom]
    print(f"   {nom}")
    ds = []
    for i in range(10):
        d = tuple(c[i][k] - r[i][k] for k in range(3))
        ds.append(d)
        print(f"      {i*10:3d}-{(i+1)*10:3d} %  ref={r[i]}  jeu={c[i]}  delta={d}")
    mx = max(max(abs(v) for v in d) for d in ds)
    print(f"      |delta| MAX par canal = {mx}/255   (tolerance d'aplat du mandat : 6/255)")

print()
print("=== CONTROLE POSITIF : cadre 54 vs cadre 57 (meme gabarit) ===")
a, b = res["E04-cadre-54"], res["E04-cadre-57"]
print("   |delta| max =", max(max(abs(a[i][k] - b[i][k]) for k in range(3)) for i in range(10)), "/255")
