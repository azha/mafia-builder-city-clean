#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m02 — repères : panneau vert (tapis) et carte crème, en px image puis en px CSS (/3,6).

Méthode : masque « vert » = g-r >= 18 et g-b >= 10 et g >= 40 ; masque « crème » =
r,g,b >= 170, r>=g>=b, (r-b) <= 60. Bbox par balayage de lignes/colonnes avec un seuil
de 2 % de la largeur pour ignorer le bruit isolé.

Contrôle positif : la largeur du panneau vert de cadre-6 et de cadre-7 (même gabarit
d'atelier, même cadre HTML) doit sortir identique ; la couleur crème échantillonnée au
centre d'une zone plate de la carte doit être la même sur cadre-6 et cadre-7.
Contrôle négatif : le masque « vert » sur cadre-5 (écran de nuit, pas de tapis vert) doit
donner une aire < 2 % — s'il trouve un panneau, l'instrument ne discrimine pas.
"""
import os
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6


def charger(chemin):
    im = Image.open(chemin).convert("RGB")
    print("  lu %s  %dx%d" % (os.path.basename(chemin), im.width, im.height))
    return im


def masque_vert(px, w, h):
    m = bytearray(w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if g - r >= 18 and g - b >= 10 and g >= 40:
                m[base + x] = 1
    return m


def masque_creme(px, w, h):
    m = bytearray(w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if r >= 170 and g >= 165 and b >= 140 and r >= g >= b and (r - b) <= 70:
                m[base + x] = 1
    return m


def bbox(m, w, h, frac=0.02):
    seuil_l = max(3, int(frac * w))
    seuil_c = max(3, int(frac * h))
    lignes = [y for y in range(h) if sum(m[y * w:(y + 1) * w]) >= seuil_l]
    cols = []
    for x in range(w):
        c = 0
        for y in range(h):
            c += m[y * w + x]
        if c >= seuil_c:
            cols.append(x)
    aire = sum(m)
    if not lignes or not cols:
        return None, 100.0 * aire / (w * h)
    return (cols[0], lignes[0], cols[-1], lignes[-1]), 100.0 * aire / (w * h)


def mediane_fenetre(px, cx, cy, rayon=6):
    vals = [[], [], []]
    for y in range(cy - rayon, cy + rayon + 1):
        for x in range(cx - rayon, cx + rayon + 1):
            r, g, b = px[x, y]
            vals[0].append(r); vals[1].append(g); vals[2].append(b)
    return tuple(sorted(v)[len(v) // 2] for v in vals)


def rapport(chemin, etiquette):
    im = charger(chemin)
    px = im.load()
    w, h = im.size
    mv = masque_vert(px, w, h)
    bv, av = bbox(mv, w, h)
    print("    %-22s vert : aire=%5.1f %%  bbox=%s" % (etiquette, av, bv))
    if bv and av > 5:
        x0, y0, x1, y1 = bv
        print("       panneau vert : L=%d px = %.1f CSS | x0=%d (%.1f CSS) x1=%d (%.1f CSS) | haut y0=%d"
              % (x1 - x0 + 1, (x1 - x0 + 1) / CSS, x0, x0 / CSS, x1, x1 / CSS, y0))
        print("       feutre au centre du panneau (mediane 13x13) :",
              mediane_fenetre(px, (x0 + x1) // 2, min(h - 10, y1 - 60)))
        # carte crème cherchée DANS le panneau vert
        sous = im.crop((x0, y0, x1 + 1, y1 + 1))
        spx = sous.load()
        sw, sh = sous.size
        mc = masque_creme(spx, sw, sh)
        bc, ac = bbox(mc, sw, sh, frac=0.03)
        if bc:
            cx0, cy0, cx1, cy1 = bc
            print("       carte creme : bbox image=(%d,%d,%d,%d)  L=%d px = %.1f CSS  H=%d px = %.1f CSS"
                  % (cx0 + x0, cy0 + y0, cx1 + x0, cy1 + y0,
                     cx1 - cx0 + 1, (cx1 - cx0 + 1) / CSS, cy1 - cy0 + 1, (cy1 - cy0 + 1) / CSS))
    return im


print("=== REFERENCES ===")
for f, e in [("cadre-5-tete-sur-ligne-haute.png", "cadre5 (ctrl negatif)"),
             ("cadre-6-apres-geste-executed.png", "cadre6"),
             ("cadre-7-echec-1re-cible.png", "cadre7")]:
    rapport(os.path.join(RACINE, "reference", f), e)

print("\n=== CAPTURES 2400 ===")
import glob
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*2400.png"))):
    rapport(f, os.path.basename(f)[:3])
