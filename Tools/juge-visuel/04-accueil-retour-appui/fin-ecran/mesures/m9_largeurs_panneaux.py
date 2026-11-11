#!/usr/bin/env python3
"""m9 (Q3) — largeur des QUATRE blocs de contenu, maquette contre jeu.

Instrument : le bord d'un bloc est un LISERE = maximum local horizontal
(L(x) >= L(x-3)+6 et L(x) >= L(x+3)+6). On lit la ligne y indiquee, qui traverse le bloc
hors texte. Largeur rendue en px CSS (/3,6) et en % de la largeur d'ecran — la seule unite
comparable entre une reference de 2102 px de haut et des captures de 1920 / 2400 (dossier.md).

CONTROLE POSITIF : la RANGEE DE FILE, mesuree ici par le meme instrument, doit donner la meme
largeur des deux cotes (m2/m3/m6 la donnaient a 91,5 % / 91,3 %). Si un instrument retrecissait
tout, il retrecirait aussi la rangee.
CONTROLE NEGATIF : le meme instrument sur une ligne de plein ciel (y=400) doit ne trouver
aucun bord durable.
"""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def L(p): return sum(p[:3]) / 3


def bords(im, y, x0=20, x1=1060):
    px = im.convert("RGB").load()
    return [x for x in range(x0, x1)
            if L(px[x, y]) >= L(px[x - 3, y]) + 6 and L(px[x, y]) >= L(px[x + 3, y]) + 6]


BLOCS = [
    ("plaque « Rien a signaler »", ("reference/cadre-1.png", 1620, None),
     ("captures/c1-rien-a-trancher-1080x1920.png", 1600, (420, 660))),
    ("carte de tete", ("reference/cadre-2.png", 1200, None),
     ("captures/c2-une-carte-de-tete-1080x1920.png", 1530, (350, 730))),
    ("panneau « La suite »", ("reference/cadre-5.png", 1100, (40, 1060)),
     ("captures/c5-joueur-neuf-la-suite-1080x1920.png", 1500, (390, 700))),
    ("RANGEE DE FILE (temoin)", ("reference/cadre-4.png", 1748, None),
     ("captures/c4-la-file-sous-pression-1080x1920.png", 1590, None)),
]

print("=== m9 : largeur des blocs de contenu, maquette contre jeu ===")
print(f"{'bloc':30s} {'maquette':>28s} {'jeu':>28s}  rapport")
for nom, (fr, yr, zr), (fj, yj, zj) in BLOCS:
    imr = Image.open(os.path.join(D, fr))
    imj = Image.open(os.path.join(D, fj))
    br = bords(imr, yr, *(zr or (20, 1060)))
    bj = bords(imj, yj, *(zj or (20, 1060)))
    wr = br[-1] - br[0] + 1
    wj = bj[-1] - bj[0] + 1
    print(f"\n{nom}")
    print(f"   maquette [{fr} {imr.width}x{imr.height}] y={yr}  x {br[0]}..{br[-1]}  "
          f"{wr}px img = {wr/3.6:.1f} px CSS = {100*wr/imr.width:.1f}% ecran")
    print(f"   jeu      [{fj} {imj.width}x{imj.height}] y={yj}  x {bj[0]}..{bj[-1]}  "
          f"{wj}px img = {wj/3.6:.1f} px CSS = {100*wj/imj.width:.1f}% ecran")
    print(f"   rapport jeu/maquette = {wj/wr:.2f}x")

print("\n--- CONTROLE POSITIF : la rangee de file doit valoir ~1,00x (lire ci-dessus). "
      "Un instrument qui retrecit tout l'aurait retrecie aussi. ---")
print("--- CONTROLE NEGATIF : plein ciel, reference/cadre-1.png, y=400 ---")
im = Image.open(os.path.join(D, "reference/cadre-1.png"))
b = bords(im, 400, 150, 930)
print(f"   image {im.width}x{im.height}  bords = {b}  -> attendu [] : "
      f"{'OK' if b == [] else 'ECHEC (instrument non discriminant)'}")
