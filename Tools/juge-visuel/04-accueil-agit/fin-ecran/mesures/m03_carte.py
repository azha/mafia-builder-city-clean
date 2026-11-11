#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m03 — la CARTE crème : largeur et hauteur mesurées par la PLUS LONGUE PLAGE crème
contiguë de chaque ligne (le jeton, lui, fait une plage courte : il est écarté).

Pour chaque image : on prend la ligne qui porte la plus longue plage crème, puis on
redescend/remonte tant que la ligne porte une plage >= 70 % de ce maximum et centrée
au même endroit (±40 px). Donne bbox carte en px image et en px CSS (/3,6).

Contrôle positif : cadre-6 et cadre-7 (même gabarit d'atelier) doivent donner la MÊME
largeur de carte ; les 6 captures (même carte) doivent donner la même largeur entre elles.
Contrôle négatif : la même mesure sur cadre-5 / H01 (aucune carte crème) doit échouer
(plage max < 150 px) — sinon l'instrument confond le fond et la carte.
"""
import os, glob
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6


def est_creme(r, g, b):
    return r >= 170 and g >= 160 and b >= 130 and r >= g >= b and (r - b) <= 80


def plage_max(px, w, y):
    best = (0, -1, -1)
    cur = 0
    for x in range(w):
        r, g, b = px[x, y]
        if est_creme(r, g, b):
            cur += 1
        else:
            if cur > best[0]:
                best = (cur, x - cur, x - 1)
            cur = 0
    if cur > best[0]:
        best = (cur, w - cur, w - 1)
    return best


def carte(chemin):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    w, h = im.size
    print("  lu %s  %dx%d" % (os.path.basename(chemin), w, h))
    profil = [plage_max(px, w, y) for y in range(h)]
    lmax = max(p[0] for p in profil)
    if lmax < 150:
        print("     AUCUNE carte creme (plage max = %d px) -> controle negatif OK" % lmax)
        return None
    ybest = max(range(h), key=lambda y: profil[y][0])
    cx = (profil[ybest][1] + profil[ybest][2]) // 2
    ok = lambda y: profil[y][0] >= 0.70 * lmax and abs((profil[y][1] + profil[y][2]) // 2 - cx) <= 40
    y0 = ybest
    while y0 - 1 >= 0 and ok(y0 - 1):
        y0 -= 1
    y1 = ybest
    while y1 + 1 < h and ok(y1 + 1):
        y1 += 1
    x0 = min(profil[y][1] for y in range(y0, y1 + 1))
    x1 = max(profil[y][2] for y in range(y0, y1 + 1))
    print("     carte : x %d..%d (L=%d px = %.1f CSS) | y %d..%d (H=%d px = %.1f CSS)"
          % (x0, x1, x1 - x0 + 1, (x1 - x0 + 1) / CSS, y0, y1, y1 - y0 + 1, (y1 - y0 + 1) / CSS))
    print("     ratio H/L de la carte = %.3f" % ((y1 - y0 + 1) / float(x1 - x0 + 1)))
    return (x0, y0, x1, y1)


print("=== REFERENCES ===")
for f in ["cadre-5-tete-sur-ligne-haute.png", "cadre-6-apres-geste-executed.png",
          "cadre-7-echec-1re-cible.png"]:
    carte(os.path.join(RACINE, "reference", f))

print("\n=== CAPTURES 2400 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*2400.png"))):
    carte(f)

print("\n=== CAPTURES 1920 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*1920.png"))):
    carte(f)
