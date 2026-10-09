#!/usr/bin/env python3
"""P2 — E04 ㉘ : la planche (panneau de liege) qui porte la fiche.
   matiere (grain, couleur) + encadrement (nombre de filets), contre les cadres 54-58.

Methode : profil horizontal de couleur a mi-hauteur de la planche. Un « filet » = un palier de
couleur d'au moins 2 px d'image borne par deux sauts > 10/255 sur la somme des canaux.
Couleur du liege : mediane d'une fenetre PRISE A >= 3 px DE TOUT BORD, entre les pois du grain.
Grain : periode des pois, mesuree par la distance entre minima locaux du profil horizontal du liege.

Echelle : 1 px CSS = 3,6 px image des deux cotes.
Controle positif : les 5 cadres 54-58 doivent rendre le MEME encadrement et la meme couleur de liege.
Controle negatif : la couleur du liege doit differer de celle de la fiche creme (sinon le profil ne voit rien).
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from outils import *

def profil(im, y, x0, x1):
    return [im.getpixel((x, y)) for x in range(x0, x1)]

def paliers(p, x0, seuil=10, mini=2):
    """Decoupe un profil en paliers : saut = somme des |delta| par canal > seuil."""
    out, deb = [], 0
    for i in range(1, len(p)):
        d = sum(abs(p[i][c] - p[i - 1][c]) for c in range(3))
        if d > seuil:
            if i - deb >= mini:
                seg = p[deb:i]
                m = tuple(sorted(s[c] for s in seg)[len(seg) // 2] for c in range(3))
                out.append((x0 + deb, x0 + i - 1, i - deb, m))
            deb = i
    if len(p) - deb >= mini:
        seg = p[deb:]
        m = tuple(sorted(s[c] for s in seg)[len(seg) // 2] for c in range(3))
        out.append((x0 + deb, x0 + len(p) - 1, len(p) - deb, m))
    return out

print("=== P2 : encadrement de la planche, bord GAUCHE, profil horizontal ===")
CAS = [
    ("ref", "E04-cadre-54", 1100, 0, 120),
    ("ref", "E04-cadre-55", 1100, 0, 120),
    ("ref", "E04-cadre-56", 1100, 0, 120),
    ("ref", "E04-cadre-57", 1100, 0, 120),
    ("ref", "E04-cadre-58", 1100, 0, 120),
    ("cap", "E04_Distribution_1080x2400", 900, 0, 120),
    ("cap", "E04_Distribution_1080x1920", 900, 0, 120),
]
for kind, nom, y, x0, x1 in CAS:
    im = ouvrir(kind, nom)
    ps = paliers(profil(im, y, x0, x1), x0)
    print(f"   {nom}  y={y}")
    for a, b, n, m in ps:
        print(f"      x={a:4d}..{b:4d} ({n:3d}px = {n/K:5.2f} css)  RGB={m}")

print()
print("=== P2 : couleur du liege (mediane d'une fenetre interieure, >=3px de tout bord) ===")
FEN = [
    ("ref", "E04-cadre-54", (520, 1150, 620, 1250)),
    ("ref", "E04-cadre-55", (520, 1150, 620, 1250)),
    ("ref", "E04-cadre-56", (520, 1150, 620, 1250)),
    ("ref", "E04-cadre-57", (520, 1150, 620, 1250)),
    ("ref", "E04-cadre-58", (520, 1150, 620, 1250)),
    ("cap", "E04_Distribution_1080x2400", (520, 950, 620, 1050)),
    ("cap", "E04_Distribution_1080x1920", (520, 950, 620, 1050)),
]
for kind, nom, f in FEN:
    im = ouvrir(kind, nom)
    (m, n) = med(im, *f)
    # min / max de la fenetre : amplitude du grain
    px = list(im.crop(f).getdata())
    lum8 = sorted(sum(p) / 3 for p in px)
    print(f"   {nom:30s} fenetre={f} n={n}px  mediane RGB={m}  "
          f"grain p5={lum8[int(.05*n)]:.0f} p95={lum8[int(.95*n)]:.0f} amplitude={lum8[int(.95*n)]-lum8[int(.05*n)]:.0f}/255")

print()
print("=== CONTROLE NEGATIF : liege vs fiche creme (le profil doit les separer) ===")
im = ouvrir("ref", "E04-cadre-54")
print("   ref liege ", med(im, 520, 1150, 620, 1250)[0], " fiche creme ", med(im, 300, 700, 400, 740)[0])
im2 = ouvrir("cap", "E04_Distribution_1080x2400")
print("   cap liege ", med(im2, 520, 950, 620, 1050)[0], " fiche creme ", med(im2, 300, 790, 400, 820)[0])
