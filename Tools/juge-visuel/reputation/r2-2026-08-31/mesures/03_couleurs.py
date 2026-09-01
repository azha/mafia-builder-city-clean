#!/usr/bin/env python3
"""03 — Couleurs : aplats (médiane de fenêtre, >= 3 px de tout bord), encres,
palette quantifiée, luminance moyenne, densité d'encre.

Contrôle positif : l'or du liseré (176,141,62) et le cyan des compteurs
(127,212,217) — deux tokens recopiés, qui DOIVENT sortir égaux.
Contrôle négatif : le voile intérieur des tuiles-compteurs, dont je sais
(profil vertical) qu'il existe dans la maquette et pas dans le jeu.
"""
from PIL import Image
from statistics import median
import os

D = os.path.dirname(__file__)
REF = os.path.join(D, "..", "reference", "m-120.png")
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def med(im, cx, cy, rad=3):
    px = im.load()
    ech = [px[cx + dx, cy + dy] for dx in range(-rad, rad + 1) for dy in range(-rad, rad + 1)]
    return tuple(int(median([p[i] for p in ech])) for i in range(3))


def encre(im, box):
    """pixel le plus vif de la zone = la couleur du texte, hors frange d'anti-crénelage"""
    px = im.load()
    best = None
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            p = px[x, y]
            if best is None or sum(p) > sum(best):
                best = p
    return best


def encre_verte(im, box):
    """mode des pixels franchement verts : la couleur PLEINE du texte,
    pas le pixel le plus saturé (qui est une frange d'anti-crénelage)."""
    px = im.load()
    hist = {}
    for x in range(box[0], box[2]):
        for y in range(box[1], box[3]):
            p = px[x, y]
            if p[1] > 140 and p[1] > p[0] + 30 and p[1] > p[2] + 30:
                hist[p] = hist.get(p, 0) + 1
    return max(hist.items(), key=lambda kv: kv[1])[0] if hist else None


def couche(im, box, label, scale):
    q = im.crop(box)
    n = q.size[0] * q.size[1]
    cols = sorted(q.getcolors(1 << 22), reverse=True)[:6]
    lum = 0
    encre_n = 0
    px = q.load()
    for x in range(q.size[0]):
        for y in range(q.size[1]):
            L = sum(px[x, y]) / 3
            lum += L
            if L > 45:
                encre_n += 1
    print(f"  {label}  ({q.size[0]/scale:.0f}x{q.size[1]/scale:.0f} CSS)")
    print(f"    luminance moyenne : {lum/n:.1f}/255")
    print(f"    densité d'encre (L>45) : {encre_n*100/n:.2f} %")
    print("    palette dominante :", [(c, f"{k*100/n:.1f}%") for k, c in cols])


def main():
    r = Image.open(REF).convert("RGB")
    c = Image.open(CAP).convert("RGB")
    print(f"REF {os.path.basename(REF)} {r.size}   CAP {os.path.basename(CAP)} {c.size}")

    print("\n[ENCRES]  (delta max par canal ; tolérance 6/255)")
    paires = [
        ("titre « Le miroir » (or)", (300, 420, 700, 470), (340, 70, 780, 140)),
        ("compteurs « 00 » (cyan)", (140, 600, 230, 640), (160, 270, 260, 330)),
        ("libellé compteur (gris)", (70, 645, 280, 670), (80, 335, 340, 365)),
        ("sous-titre (crème)", (120, 490, 780, 515), (60, 155, 1020, 190)),
    ]
    for nom, br, bc in paires:
        a, b = encre(r, br), encre(c, bc)
        print(f"  {nom:28s} réf {a}  jeu {b}  delta {max(abs(x-y) for x, y in zip(a,b))}")
    a = encre_verte(r, (260, 1190, 380, 1225))
    b = encre_verte(c, (80, 950, 520, 1080))
    print(f"  {'« Il vous écoute » (vert)':28s} réf {a}  jeu {b}  "
          f"delta {max(abs(x-y) for x, y in zip(a,b))}")

    print("\n[APLATS]  (médiane d'une fenêtre 7x7, à >= 3 px de tout bord)")
    aplats = [
        ("fond de page", (450, 1740), (540, 1910)),
        ("panneau CORPS", (600, 1250), (700, 1250)),
        ("carte-portrait", (200, 800), (250, 530)),
        ("tuile-règle", (700, 900), (900, 600)),
        ("panneau épilogue", (450, 1400), (540, 1450)),

    ]
    for nom, pr, pc in aplats:
        a, b = med(r, *pr), med(c, *pc)
        print(f"  {nom:22s} réf {a}  jeu {b}  delta {max(abs(x-y) for x, y in zip(a,b))}")

    print("\n[LISERÉ]  médiane le long du bord lui-même (1 px de large, 61 px de haut)")
    for lab, im, x, y0, y1 in (("réf", r, 453, 850, 911), ("jeu", c, 533, 600, 661)):
        px = im.load()
        ech = [px[x, y] for y in range(y0, y1)]
        print(f"  {lab} :",
              tuple(int(median([p[i] for p in ech])) for i in range(3)))

    print("\n[CONTRÔLE NÉGATIF] voile intérieur d'une tuile-compteur "
          "(profil vertical, colonne au quart)")
    # plage de y choisie SANS glyphe sur cette colonne (le libellé commence plus bas) :
    for lab, im, x, y0, y1, s in (("réf", r, 80, 592, 648, 3.0), ("jeu", c, 95, 270, 340, 3.6)):
        px = im.load()
        vals = [px[x, y] for y in range(y0, y1)]
        mn, mx = min(vals, key=sum), max(vals, key=sum)
        print(f"  {lab} : min {mn}  max {mx}  amplitude du voile "
              f"{sum(mx)-sum(mn)} (somme des canaux)")

    print("\n[COUCHE GLOBALE]  zone comparable = le panneau d'or, du haut au bas")
    couche(r, (18, 376, 882, 1731), "RÉF  panneau", 3.0)
    couche(c, (18, 18, 1062, 1901), "JEU  panneau", 3.6)


if __name__ == "__main__":
    main()
