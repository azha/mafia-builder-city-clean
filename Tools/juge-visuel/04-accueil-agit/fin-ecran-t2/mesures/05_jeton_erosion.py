#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""05 — LE JETON seul. Les detecteurs de 03 et 04 ont RATE (rondeur 0,19 a 0,33 : ils comptaient les
lignes-or et les glyphes dores). Ici : masque dore EROSE par un disque de rayon 6 px — un trait de
2-3 px et une panse de glyphe de 5 px ne survivent pas, un disque de ~145 px oui.

Contrôles :
  POSITIF — la RONDEUR (diam_x/diam_y) du jeton doit valoir ~1,00 dans la reference ET dans la
            capture (c'est un disque dans les deux). Un detecteur qui rend 1,00 des deux cotes
            discrimine ; celui de 04 rendait 0,2.
  NEGATIF — cadre 5 (pas de jeton) : AUCUNE composante ne doit survivre a l'erosion dans la bande.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, "reference")
CAP = os.path.join(D, "captures")
ECH = 3.6
R = 6


def est_dore(p):
    r, g, b = p
    return r > 165 and 120 < g < 230 and b < 170 and (r - b) > 50


def masque_erose(im, x0, x1, y0, y1):
    px = im.convert("RGB").load()
    brut = set()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if est_dore(px[x, y]):
                brut.add((x, y))
    out = set()
    for (x, y) in brut:
        ok = True
        for dy in range(-R, R + 1):
            if not ok:
                break
            for dx in range(-R, R + 1):
                if dx * dx + dy * dy <= R * R and (x + dx, y + dy) not in brut:
                    ok = False
                    break
        if ok:
            out.add((x, y))
    return out


def composantes(pts):
    """composantes connexes 4-voisins, en iteratif."""
    restants = set(pts)
    comps = []
    while restants:
        seed = restants.pop()
        pile = [seed]
        comp = {seed}
        while pile:
            x, y = pile.pop()
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n in restants:
                    restants.discard(n)
                    comp.add(n)
                    pile.append(n)
        comps.append(comp)
    comps.sort(key=len, reverse=True)
    return comps


def rapport(path, bande):
    im = Image.open(path)
    w, h = im.size
    x0, x1, y0, y1 = bande
    pts = masque_erose(im, x0, x1, y0, min(y1, h))
    comps = composantes(pts)
    print("=== %s  %dx%d   bande=%s   %d px erodes, %d composantes" %
          (os.path.basename(path), w, h, str(bande), len(pts), len(comps)))
    if not comps:
        print("    AUCUN disque (detecteur muet)")
        return None
    c = comps[0]
    xs = [p[0] for p in c]
    ys = [p[1] for p in c]
    # on rend le bbox du disque PLEIN : on redilate de R
    jx0, jx1 = min(xs) - R, max(xs) + R
    jy0, jy1 = min(ys) - R, max(ys) + R
    dx = jx1 - jx0 + 1
    dy = jy1 - jy0 + 1
    print("    DISQUE x=[%d..%d] y=[%d..%d]  diam_x=%d px (%.1f CSS)  diam_y=%d px  RONDEUR=%.3f  (aire erodee=%d)" %
          (jx0, jx1, jy0, jy1, dx, dx / ECH, dy, dx / float(dy), len(c)))
    print("           centre=(%.1f, %.1f)  centre_x = %.2f %% de la largeur d'ecran" %
          ((jx0 + jx1) / 2.0, (jy0 + jy1) / 2.0, 100.0 * ((jx0 + jx1) / 2.0) / w))
    return (jx0, jy0, jx1, jy1)


print(">>> CONTROLE NEGATIF — cadre 5, bande droite, pas de jeton")
rapport(os.path.join(REF, "cadre-5-tete-sur-ligne-haute.png"), (700, 1080, 600, 1800))
print()
print(">>> REFERENCES")
rapport(os.path.join(REF, "cadre-6-apres-geste-executed.png"), (700, 1080, 600, 1500))
rapport(os.path.join(REF, "cadre-7-echec-1re-cible.png"), (700, 1080, 700, 1600))
print()
print(">>> CAPTURES 1080x2400")
for f, b in [("G01_ApresGeste_executed", (700, 1080, 950, 1900)),
             ("G02_ApresGeste_noted", (700, 1080, 1050, 1990)),
             ("G03_ApresGeste_deja_tranchee", (700, 1080, 1120, 2060)),
             ("G04_ApresGeste_404_plus_la", (700, 1080, 1120, 2000)),
             ("G05_ApresGeste_premiere_cible_en_echec", (700, 1080, 1020, 1960)),
             ("G06_ApresGeste_noted_structurelle", (700, 1080, 1050, 1990))]:
    rapport(os.path.join(CAP, f + "_c3aa3bbdb_b35bdd6cb_1080x2400.png"), b)
