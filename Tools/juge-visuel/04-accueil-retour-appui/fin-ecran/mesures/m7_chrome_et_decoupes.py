#!/usr/bin/env python3
"""m7 (Q3) — le chrome haut (ARGENT / JOUR / jauge) : y a-t-il une VALEUR servie ?
+ production des decoupes citees dans le rapport (mesures/decoupe-*.png).

Instrument : on compte l'encre (L > 60) dans la boite ou la maquette pose la VALEUR,
sous l'etiquette. En reference, « 24 850 € » et « Plein jour » remplissent ces boites.

CONTROLE POSITIF : dans reference/cadre-1.png les deux boites de valeur sont encrees (> 300 px).
CONTROLE NEGATIF : une boite prise dans le ciel vide (x 300..500, meme hauteur) doit rendre ~0.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.dirname(os.path.abspath(__file__))


def encre(im, x0, y0, x1, y1, seuil=60):
    px = im.convert("RGB").load()
    return sum(1 for y in range(y0, y1) for x in range(x0, x1) if sum(px[x, y][:3]) / 3 > seuil)


# boites de valeur, en % de largeur, converties par image ; en Y on reste en px (chrome ancre en haut)
BOITES = {
    "ARGENT (valeur)": (40, 60, 340, 115),
    "JOUR (valeur)":   (700, 55, 1045, 115),
    "jauge (libelle central)": (430, 115, 650, 150),
}

CIBLES = [
    ("reference/cadre-1.png", "REF cadre 1"),
    ("captures/c1-rien-a-trancher-1080x1920.png", "JEU c1 1920"),
    ("captures/c4-la-file-sous-pression-1080x1920.png", "JEU c4 1920"),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x2400.png", "JEU c6 2400"),
]

print("=== m7 : encre dans les boites de valeur du chrome ===")
for rel, lib in CIBLES:
    im = Image.open(os.path.join(D, rel))
    print(f"\n{lib}  [{rel}]  image {im.width}x{im.height}")
    for nom, (x0, y0, x1, y1) in BOITES.items():
        n = encre(im, x0, y0, x1, y1)
        aire = (x1 - x0) * (y1 - y0)
        print(f"   {nom:26s} boite ({x0},{y0})-({x1},{y1})  encre={n:5d} px "
              f"({100*n/aire:4.1f}% de la boite)  {'SERVIE' if n > 300 else 'VIDE / quasi vide'}")

print("\n--- CONTROLE POSITIF : REF cadre 1, les 3 boites doivent etre SERVIES (lire ci-dessus) ---")
print("--- CONTROLE NEGATIF : boite prise dans le ciel vide (x 300..500, y 250..310) ---")
for rel, lib in CIBLES:
    im = Image.open(os.path.join(D, rel))
    n = encre(im, 300, 250, 500, 310)
    print(f"   {lib:14s} {im.width}x{im.height}  encre ciel = {n} px -> attendu ~0 : "
          f"{'OK' if n < 50 else 'ECHEC (instrument non discriminant)'}")

print("\n=== decoupes produites (preuve visuelle citee dans le rapport) ===")
DEC = [
    ("captures/c1-rien-a-trancher-1080x1920.png", (340, 1565, 740, 1685), "decoupe-c1-chevauchement.png"),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", (340, 1330, 740, 1520), "decoupe-c6-carte-titre.png"),
    ("captures/c6-carte-de-tete-au-dessus-de-la-file-1080x1920.png", (40, 1510, 1040, 1675), "decoupe-c6-rangee-trancher.png"),
    ("reference/cadre-6.png", (40, 1525, 1040, 1835), "decoupe-REF6-rangee-trancher.png"),
    ("captures/c1-rien-a-trancher-1080x1920.png", (0, 0, 1080, 200), "decoupe-c1-chrome.png"),
    ("reference/cadre-1.png", (0, 0, 1080, 200), "decoupe-REF1-chrome.png"),
]
for rel, box, nom in DEC:
    im = Image.open(os.path.join(D, rel))
    c = im.crop(box)
    k = max(1, 1600 // max(1, c.width))
    if k > 1:
        c = c.resize((c.width * k, c.height * k), Image.NEAREST)
    c.save(os.path.join(M, nom))
    print(f"   {rel} {im.width}x{im.height} crop{box} x{k} -> mesures/{nom} {c.size}")
