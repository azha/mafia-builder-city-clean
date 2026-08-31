#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — LA MONTRE (trait de portrait déclaré A7).

Les masques de teinte ont échoué à isoler l'ellipse (le liseré de la veste
partage sa couleur : aire/boîte ≈ 0,06, donc le masque ne délimite rien). On
mesure donc autrement, avec un instrument qui n'a pas besoin de segmenter :

  · une CARTE ASCII de luminance de la zone, à la même grille relative dans les
    deux images (30 % de la largeur de la carte × 20 % de sa hauteur, 40x18
    cellules) — chaque cellule est la MÉDIANE d'un bloc ;
  · l'ÉTENDUE de luminance dans la zone (p05..p95) et le nombre de niveaux
    distincts : un cadran avec aiguilles fait plus de niveaux qu'une ellipse nue ;
  · la largeur de l'ellipse mesurée sur la ligne médiane par le comptage des
    cellules au-dessus du fond de la veste.

CONTRÔLE POSITIF : la même grille prise sur le VISAGE (aplat de chair connu,
identique dans les deux images d'après 04_couleurs.py) doit donner la même
étendue de luminance dans les deux — si l'instrument y trouvait un écart, il ne
mesurerait pas la montre non plus.
CONTRÔLE NÉGATIF : la même grille prise sur un carré de fond de carte doit
donner une étendue quasi nulle.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CARTE = {"REF": (72, 735, 420, 1277), "JEU": (75, 439, 493, 1058)}

ZONES = {
    "montre":       (0.08, 0.73, 0.44, 0.95),
    "visage [+]":   (0.36, 0.36, 0.62, 0.52),
    "fond carte [-]": (0.05, 0.18, 0.28, 0.26),
}
RAMPE = " .:-=+*#%@"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def grille(im, box, nx, ny):
    px = im.load()
    x0, y0, x1, y1 = box
    out = []
    for j in range(ny):
        ligne = []
        for i in range(nx):
            ax = x0 + (x1 - x0) * i // nx
            bx = max(ax + 1, x0 + (x1 - x0) * (i + 1) // nx)
            ay = y0 + (y1 - y0) * j // ny
            by = max(ay + 1, y0 + (y1 - y0) * (j + 1) // ny)
            v = sorted(lum(px[x, y]) for y in range(ay, by) for x in range(ax, bx))
            ligne.append(v[len(v) // 2])
        out.append(ligne)
    return out


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        x0, y0, x1, y1 = CARTE[nom]
        W, H = x1 - x0, y1 - y0
        print("=" * 74)
        print(f"{nom} {path} {im.size}   carte {W}x{H} px")
        for zn, (fa, fb, fc, fd) in ZONES.items():
            box = (x0 + int(fa * W), y0 + int(fb * H), x0 + int(fc * W), y0 + int(fd * H))
            nx, ny = (44, 16) if zn == "montre" else (20, 8)
            g = grille(im, box, nx, ny)
            plat = sorted(v for l in g for v in l)
            p05, p95 = plat[len(plat) // 20], plat[19 * len(plat) // 20]
            niv = len({round(v / 6) for v in plat})
            print(f"  --- zone « {zn} » box={box}  "
                  f"luminance p05..p95 = {round(p05,1)}..{round(p95,1)} "
                  f"(étendue {round(p95-p05,1)}), {niv} niveaux distincts")
            if zn == "montre":
                lo, hi = min(plat), max(plat)
                for l in g:
                    print("      |" + "".join(
                        RAMPE[min(9, int(9 * (v - lo) / max(1e-6, hi - lo)))] for v in l) + "|")


main()
