#!/usr/bin/env python3
"""01 — gouttiere laterale et bords des deux cartes (.verre / .suivant).

Methode : sur une ligne horizontale TRAVERSANT une carte, le bord de la carte est
le saut de luminance le plus net dans les 150 premiers px (gauche) / derniers (droite).
On cherche le MAXIMUM du gradient |L(x+1)-L(x-1)| lisse sur 3 px.

Controle positif : la gouttiere CSS est 12 px (atelier `.verre{margin:0 12px}` et
`.suivant{margin:0 12px}`) => 12 x 3,6 = 43,2 px image. On verifie que la REFERENCE la rend.
Controle negatif : la meme recherche sur une ligne du CIEL (hors carte) ne doit PAS
retourner un bord net au meme x.
"""
import sys
sys.path.insert(0, "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r6-2026-10-08/mesures")
from outil import ouvrir, css, luminance_simple, mediane_fenetre


def bord(im, y, cote, marge=170):
    px = im.load()
    W = im.size[0]
    L = [luminance_simple(px[x, y]) for x in range(W)]
    best, bx = -1, None
    if cote == "g":
        rng = range(3, marge)
    else:
        rng = range(W - marge, W - 3)
    for x in rng:
        g = abs(L[x + 1] - L[x - 1]) + abs(L[x + 2] - L[x - 2])
        if g > best:
            best, bx = g, x
    return bx, best


# (cle, [(nom de la carte, y de sondage)])
SONDES = {
    "ref4": [("verre (LA SUITE)", 1100), ("suivant (ligne de file)", 1660)],
    "ref5": [("verre (carte de TETE)", 1150), ("suivant (ligne de file)", 1660)],
    "c24":  [("verre (LA SUITE)", 1250), ("suivant (ligne de file)", 1900)],
    "c19":  [("verre (LA SUITE)", 1050), ("suivant (ligne de file)", 1560)],
    "l24":  [("verre (carte de TETE)", 1500), ("suivant (ligne de file)", 1900)],
    "l19":  [("verre (carte de TETE)", 1200), ("suivant (ligne de file)", 1560)],
}

print("=== 01 — gouttiere laterale ===")
for cle, sondes in SONDES.items():
    im = ouvrir(cle)
    W = im.size[0]
    for nom, y in sondes:
        xg, gg = bord(im, y, "g")
        xd, gd = bord(im, y, "d")
        print(f"   {nom:26s} y={y:5d}  bord G x={xg:4d} (grad {gg:6.1f})  "
              f"bord D x={xd:4d} (grad {gd:6.1f})  "
              f"gouttiere G={xg:3d}px={css(xg):5.2f}CSS  D={W-1-xd:3d}px={css(W-1-xd):5.2f}CSS  "
              f"largeur={xd-xg:4d}px={css(xd-xg):6.2f}CSS")
    print()

print("=== CONTROLE POSITIF : gouttiere CSS attendue 12,00 (atelier .verre/.suivant margin:0 12px) ===")
print("=== CONTROLE NEGATIF : meme detecteur sur une ligne de CIEL (aucune carte) ===")
for cle, yciel in (("ref4", 300), ("c24", 300), ("l24", 300)):
    im = ouvrir(cle, bavard=False)
    xg, gg = bord(im, yciel, "g")
    xd, gd = bord(im, yciel, "d")
    print(f"   {cle} y={yciel} ciel : bord G x={xg} grad={gg:.1f} | bord D x={xd} grad={gd:.1f}"
          f"   -> gradients {'FAIBLES (OK, discrimine)' if max(gg,gd) < 30 else 'FORTS (attention)'}")
