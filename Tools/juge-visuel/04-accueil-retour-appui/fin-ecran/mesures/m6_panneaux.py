#!/usr/bin/env python3
"""m6 (Q2 + Q3) — largeur des PANNEAUX de contenu (plaque vide, carte de tete, panneau « La suite »)
et bord BAS de la plaque de c1, pour dire si les deux libelles blancs en sortent.

Instrument : sur une ligne y donnee, les bords du panneau sont les deux x extremes dont la
luminance depasse 35 dans la fenetre 150..930 (le lisere du panneau). On rend la largeur en px CSS
et en % de la largeur d'ecran — seule unite comparable entre 2102 et 1920/2400 (dossier.md).

CONTROLE POSITIF : la rangee de file, mesuree par m3, vaut 91,5 % (reference) et 91,3 % (jeu).
On la remesure ici par CE script : les deux instruments doivent donner la meme valeur.
CONTROLE NEGATIF : la meme recherche sur une ligne de plein ciel (y=400) doit ne rien borner
(aucun pixel au-dessus de 35 entre 150 et 930) sur reference/cadre-1.png.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def bords(im, y, x0=150, x1=930, seuil=35):
    px = im.convert("RGB").load()
    xs = [x for x in range(x0, x1) if sum(px[x, y][:3]) / 3 >= seuil]
    return (min(xs), max(xs)) if xs else None


def pct(im, b):
    if b is None: return "introuvable"
    w = b[1] - b[0] + 1
    return f"x {b[0]}..{b[1]}  l={w}px img = {w/3.6:.1f} px CSS = {100*w/im.width:.1f}% ecran"


CAS = [
    # (chemin, libelle, y ou le panneau est plein, description)
    ("reference/cadre-1.png", "REF cadre 1 — plaque « Rien a signaler »", 1660, "ligne de corps"),
    ("captures/c1-rien-a-trancher-1080x1920.png", "JEU c1 1920 — plaque", 1600, "ligne de corps"),
    ("captures/c1-rien-a-trancher-1080x2400.png", "JEU c1 2400 — plaque", 2080, "ligne de corps"),
    ("reference/cadre-2.png", "REF cadre 2 — carte de tete", 1300, "entre titre et gestes"),
    ("captures/c2-une-carte-de-tete-1080x1920.png", "JEU c2 1920 — carte de tete", 1520, "corps de carte"),
    ("captures/c2-une-carte-de-tete-1080x2400.png", "JEU c2 2400 — carte de tete", 2000, "corps de carte"),
    ("reference/cadre-5.png", "REF cadre 5 — panneau « La suite »", 1000, "corps du panneau"),
    ("captures/c5-joueur-neuf-la-suite-1080x1920.png", "JEU c5 1920 — panneau « La suite »", 1500, "corps"),
    ("captures/c5-joueur-neuf-la-suite-1080x2400.png", "JEU c5 2400 — panneau « La suite »", 1980, "corps"),
]

print("=== m6 : largeur des panneaux de contenu ===")
for rel, lib, y, note in CAS:
    im = Image.open(os.path.join(D, rel))
    print(f"\n{lib}  [{rel}]  image {im.width}x{im.height}  ligne y={y} ({note})")
    print(f"   {pct(im, bords(im, y))}")

print("\n=== bord BAS de la plaque de c1 (1920) et position des deux libelles blancs ===")
im = Image.open(os.path.join(D, "captures/c1-rien-a-trancher-1080x1920.png"))
px = im.convert("RGB").load()
print(f"   [captures/c1-rien-a-trancher-1080x1920.png]  image {im.width}x{im.height}")
derniere = None
for y in range(1570, 1660):
    b = bords(im, y, 380, 720, 35)
    if b and b[1] - b[0] > 180:   # les DEUX cotes de la plaque presents
        derniere = y
        if derniere == y and y < 1590:
            print(f"   premiere ligne ou la plaque est bornee : y={y}  {pct(im, b)}")
print(f"   derniere ligne ou les deux bords de la plaque sont presents : y={derniere}")
print("   bande d'encre blanche des deux libelles (m5) : y 1629..1670")
print(f"   => les libelles commencent {1629-derniere:+d} px APRES le bas de la plaque "
      f"-> {'HORS plaque' if 1629 > derniere else 'dans la plaque'}")

print("\n--- CONTROLE POSITIF : la rangee de file remesuree par CE script ---")
for rel, y, att in [("reference/cadre-4.png", 1748, "91.5%"),
                    ("captures/c4-la-file-sous-pression-1080x1920.png", 1590, "91.3%")]:
    im = Image.open(os.path.join(D, rel))
    b = bords(im, y, 20, 1060)
    print(f"   {rel}  {im.width}x{im.height}  y={y} -> {pct(im, b)}   (m3 donnait {att})")

print("\n--- CONTROLE NEGATIF : plein ciel, reference/cadre-1.png, y=400, x 150..930 ---")
im = Image.open(os.path.join(D, "reference/cadre-1.png"))
b = bords(im, 400)
print(f"   image {im.width}x{im.height}  bords = {b}  -> attendu None : "
      f"{'OK' if b is None else 'ECHEC (instrument non discriminant)'}")
