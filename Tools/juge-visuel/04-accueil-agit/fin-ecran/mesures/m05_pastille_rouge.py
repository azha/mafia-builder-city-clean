#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""m05 — le DISQUE ROUGE en haut à droite de la carte (capture) : existe-t-il dans la
référence ? quelle taille ? que recouvre-t-il ?

Masque « rouge vif » : r >= 120, r - g >= 60, r - b >= 60. On rend les composantes
connexes (balayage par plages + union-find) et on garde celles dont l'aire >= 2000 px.

Contrôle positif : le petit losange ♦ « TACTIQUE » (rouge sombre) est présent dans la
référence ET dans la capture ; on abaisse le seuil d'aire à 200 px pour le retrouver des
deux côtés — l'instrument voit donc bien du rouge dans la référence.
Contrôle négatif : aucun disque >= 2000 px dans cadre-6 / cadre-7 si la maquette n'en
dessine pas.
"""
import os, glob
from PIL import Image

RACINE = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil-agit/fin-ecran"
CSS = 3.6


def composantes(px, w, h, test, aire_min, y0=0, y1=None):
    y1 = h if y1 is None else y1
    parent = {}

    def trouve(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def unit(a, b):
        ra, rb = trouve(a), trouve(b)
        if ra != rb:
            parent[rb] = ra

    prec = []
    comps = {}
    for y in range(y0, y1):
        plages = []
        cur = None
        for x in range(w):
            r, g, b = px[x, y]
            if test(r, g, b):
                if cur is None:
                    cur = x
            else:
                if cur is not None:
                    plages.append((cur, x - 1)); cur = None
        if cur is not None:
            plages.append((cur, w - 1))
        ids = []
        for (a, b) in plages:
            cle = (y, a)
            parent[cle] = cle
            comps[cle] = [b - a + 1, a, y, b, y]
            ids.append((a, b, cle))
        for (a, b, cle) in ids:
            for (pa, pb, pcle) in prec:
                if a <= pb and pa <= b:
                    unit(pcle, cle)
        prec = ids
    agg = {}
    for cle, (n, x0, yy0, x1_, yy1) in comps.items():
        r = trouve(cle)
        if r not in agg:
            agg[r] = [0, 10 ** 9, 10 ** 9, -1, -1]
        a = agg[r]
        a[0] += n
        a[1] = min(a[1], x0); a[2] = min(a[2], yy0)
        a[3] = max(a[3], x1_); a[4] = max(a[4], yy1)
    return sorted([v for v in agg.values() if v[0] >= aire_min], key=lambda v: -v[0])


def rouge_vif(r, g, b):
    return r >= 120 and r - g >= 60 and r - b >= 60


def analyse(chemin, aire_min=2000):
    im = Image.open(chemin).convert("RGB")
    px = im.load()
    w, h = im.size
    print("  lu %s  %dx%d" % (os.path.basename(chemin), w, h))
    gros = composantes(px, w, h, rouge_vif, aire_min)
    if not gros:
        print("     AUCUNE tache rouge vif >= %d px" % aire_min)
    for a, x0, y0, x1, y1 in gros[:4]:
        L = x1 - x0 + 1; H = y1 - y0 + 1
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        print("     tache rouge : aire=%6d px | bbox x %d..%d y %d..%d | L=%d (%.1f CSS) H=%d (%.1f CSS) | centre=(%d,%d) | RGB centre=%s"
              % (a, x0, x1, y0, y1, L, L / CSS, H, H / CSS, cx, cy, px[cx, y0 + H // 4]))
    petits = composantes(px, w, h, rouge_vif, 200)
    print("     [controle positif] taches rouges >= 200 px : %d  (la plus petite : aire=%d, L=%d px)"
          % (len(petits), petits[-1][0], petits[-1][3] - petits[-1][1] + 1) if petits else "     aucune")
    return gros


print("=== REFERENCES (la maquette dessine-t-elle un disque rouge ?) ===")
for f in ["cadre-5-tete-sur-ligne-haute.png", "cadre-6-apres-geste-executed.png",
          "cadre-7-echec-1re-cible.png"]:
    analyse(os.path.join(RACINE, "reference", f))

print("\n=== CAPTURES 2400 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*2400.png"))):
    analyse(f)

print("\n=== CAPTURES 1920 ===")
for f in sorted(glob.glob(os.path.join(RACINE, "captures", "*1920.png"))):
    analyse(f)
