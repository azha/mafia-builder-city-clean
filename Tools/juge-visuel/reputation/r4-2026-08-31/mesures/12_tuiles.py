#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — les deux rangées de tuiles : (a) les 3 compteurs, (b) les 4
voyants. Bords détectés par le liseré #2A3648 (±14). Tout ramené en px CSS
(réf /3,0 ; jeu /3,6) et en % de la largeur du panneau racine (287 CSS).

CONTRÔLE POSITIF : le liseré #2A3648 est le MÊME token dans les deux images
(mesuré par 04_couleurs.py : réf (42,54,72), jeu (42,53,73)) ; le détecteur
doit donc trouver exactement 3 tuiles compteurs et 4 tuiles voyants dans les
deux images. Un compte différent invaliderait la mesure avant l'écart.
CONTRÔLE NÉGATIF : le même détecteur sur une ligne prise DANS le vide sous la
carte du portrait doit rendre 0 tuile.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def is_l(p):
    return abs(p[0] - 42) < 14 and abs(p[1] - 53) < 14 and abs(p[2] - 72) < 16


def runs_x(im, y, x0, x1):
    px = im.load()
    out, cur = [], None
    for x in range(x0, x1):
        if is_l(px[x, y]):
            cur = [x, x] if cur is None else [cur[0], x]
        elif cur:
            out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out


def runs_y(im, x, y0, y1):
    px = im.load()
    out, cur = [], None
    for y in range(y0, y1):
        if is_l(px[x, y]):
            cur = [y, y] if cur is None else [cur[0], y]
        elif cur:
            out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out


def main():
    CFG = {
        "REF": dict(path=REF, k=3.0, root=(19, 880),
                    y_cpt=630, x_cpt=(20, 880),
                    x_voy=660, y_voy=(830, 1340),
                    y_vide=1310),
        "JEU": dict(path=CAP, k=3.6, root=(19, 1060),
                    y_cpt=320, x_cpt=(20, 1060),
                    x_voy=800, y_voy=(520, 1060),
                    y_vide=1200),
    }
    for nom, c in CFG.items():
        im = Image.open(c["path"]).convert("RGB")
        k = c["k"]
        cs = lambda v: round(v / k, 1)
        rw = c["root"][1] - c["root"][0]
        print("=" * 74)
        print(f"{nom} {c['path']} {im.size}  facteur x{k}  panneau racine {cs(rw)} CSS")

        # (a) COMPTEURS : liserés verticaux sur la ligne médiane des tuiles
        r = [x for x in runs_x(im, c["y_cpt"], *c["x_cpt"])]
        # apparier par paires : bord gauche / bord droit de chaque tuile
        bords = [(a + b) // 2 for a, b in r if b - a >= 2]
        print(f"  compteurs — bords verticaux détectés : {bords}")
        if len(bords) >= 6:
            tuiles = [(bords[i], bords[i + 1]) for i in range(0, 6, 2)]
            for i, (a, b) in enumerate(tuiles):
                print(f"    tuile {i+1} : {cs(b-a)} CSS de large "
                      f"({round(100.0*(b-a)/rw,1)} % du panneau)")
            for i in range(2):
                print(f"    écart tuile {i+1}→{i+2} : {cs(tuiles[i+1][0]-tuiles[i][1])} CSS")
            print(f"    [ctrl positif] 3 tuiles trouvées : {len(tuiles)==3}")

        # (b) VOYANTS : liserés horizontaux le long d'une colonne de la liste
        ry = [(a, b) for a, b in runs_y(im, c["x_voy"], *c["y_voy"]) if b - a >= 2]
        print(f"  voyants — bords horizontaux détectés : {ry}")
        if len(ry) >= 8:
            tv = [((ry[i][0] + ry[i][1]) // 2, (ry[i + 1][0] + ry[i + 1][1]) // 2)
                  for i in range(0, 8, 2)]
            for i, (a, b) in enumerate(tv):
                print(f"    voyant {i+1} : {cs(b-a)} CSS de haut")
            for i in range(3):
                print(f"    écart voyant {i+1}→{i+2} : {cs(tv[i+1][0]-tv[i][1])} CSS")
            print(f"    [ctrl positif] 4 voyants trouvés : {len(tv)==4}")

        print(f"  [ctrl négatif] liserés sur la ligne du vide (y={c['y_vide']}) : "
              f"{runs_x(im, c['y_vide'], c['root'][0]+30, c['root'][1]-30)}  (attendu [])")

        # colonne de la liste : bords gauche/droit
        r2 = [x for x in runs_x(im, c["y_cpt"] + (300 if nom == "REF" else 370),
                                c["root"][0], c["root"][1])]
        print(f"  bords verticaux à mi-hauteur de la liste : {r2}")


main()
