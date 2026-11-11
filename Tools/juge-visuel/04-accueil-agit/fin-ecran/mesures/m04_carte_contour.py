#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m04 — contour de la CARTE : dans le panneau vert, la carte est le grand bloc NON vert.
Pour chaque ligne du panneau on prend la plus longue plage non-verte ; les lignes dont la
plage dépasse 300 px et dont le centre est stable forment la carte.

Sort : bbox carte (px image + px CSS), largeur, hauteur, ratio H/L, et la marge gauche
carte↔panneau. Le ratio H/L et les marges en % de largeur de panneau sont INVARIANTS
d'échelle : c'est sur eux que la référence (2102 px de haut) et la capture (2400 / 1920)
se comparent.

Contrôle positif : la largeur du panneau vert, déjà mesurée en m02, est redonnée ici et
doit valoir 298,3 CSS (réf) / 300,0 CSS (capture).
Contrôle négatif : cadre-5 et H01 n'ont pas de panneau vert -> aucune carte trouvée.
"""
import os, glob
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6


def est_vert(r, g, b):
    return g - r >= 14 and g - b >= 8 and g >= 30


def panneau(px, w, h):
    lignes = []
    for y in range(h):
        c = 0
        for x in range(0, w, 3):
            r, g, b = px[x, y]
            if est_vert(r, g, b):
                c += 1
        if c > 0.5 * (w / 3):
            lignes.append(y)
    if not lignes:
        return None
    return (lignes[0], lignes[-1])


def contour(chemin):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    w, h = im.size
    print("  lu %s  %dx%d" % (os.path.basename(chemin), w, h))
    p = panneau(px, w, h)
    if not p:
        print("     pas de panneau vert -> controle negatif OK")
        return None
    py0, py1 = p
    print("     panneau vert : y %d..%d  (H=%d px = %.1f CSS)" % (py0, py1, py1 - py0 + 1, (py1 - py0 + 1) / CSS))
    plages = {}
    for y in range(py0, py1 + 1):
        best = (0, -1, -1); cur = 0
        for x in range(w):
            r, g, b = px[x, y]
            if not est_vert(r, g, b):
                cur += 1
            else:
                if cur > best[0]:
                    best = (cur, x - cur, x - 1)
                cur = 0
        if cur > best[0]:
            best = (cur, w - cur, w - 1)
        plages[y] = best
    cand = [y for y in range(py0, py1 + 1) if plages[y][0] >= 300]
    if not cand:
        print("     aucune carte")
        return None
    # garder le bloc contigu le plus long
    blocs = []; deb = cand[0]; prec = cand[0]
    for y in cand[1:]:
        if y - prec > 3:
            blocs.append((deb, prec)); deb = y
        prec = y
    blocs.append((deb, prec))
    y0, y1 = max(blocs, key=lambda b: b[1] - b[0])
    x0 = min(plages[y][1] for y in range(y0, y1 + 1))
    x1 = max(plages[y][2] for y in range(y0, y1 + 1))
    L = x1 - x0 + 1; H = y1 - y0 + 1
    print("     CARTE (bord exterieur, ombre comprise) : x %d..%d  y %d..%d" % (x0, x1, y0, y1))
    print("            L=%d px = %.1f CSS | H=%d px = %.1f CSS | H/L=%.3f" % (L, L / CSS, H, H / CSS, H / float(L)))
    print("            marge gauche carte->bord image = %d px = %.1f CSS ; L carte / L ecran = %.1f %%"
          % (x0, x0 / CSS, 100.0 * L / w))
    print("            haut de carte depuis le haut du panneau = %d px = %.1f CSS" % (y0 - py0, (y0 - py0) / CSS))
    return (x0, y0, x1, y1, py0, py1)


print("=== REFERENCES ===")
for f in ["cadre-5-tete-sur-ligne-haute.png", "cadre-6-apres-geste-executed.png",
          "cadre-7-echec-1re-cible.png"]:
    contour(os.path.join(RACINE, "reference", f))

print("\n=== CAPTURES 2400 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*2400.png"))):
    contour(f)

print("\n=== CAPTURES 1920 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*1920.png"))):
    contour(f)
