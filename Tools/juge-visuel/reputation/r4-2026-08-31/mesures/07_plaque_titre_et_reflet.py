#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — deux objets précis :
 (a) la PLAQUE DU TITRE (le cadre qui entoure « Le miroir » + le sous-titre) ;
 (b) le REFLET du miroir (le trait cyan horizontal) : position, étendue, et
     surtout ce qu'il RECOUVRE ou ne recouvre pas.

(a) instrument : sur une ligne horizontale traversant la zone du titre, on
cherche un pixel de liseré #2A3648 (±14). CONTRÔLE POSITIF : la même recherche
sur la ligne des tuiles compteurs — où le liseré existe dans les DEUX images —
doit le trouver deux fois par tuile. CONTRÔLE NÉGATIF : la même recherche au
milieu d'un aplat de fond doit ne rien trouver.

(b) instrument : on cherche, colonne par colonne, la rangée la plus « cyan »
(G et B nettement > R) dans une plage y donnée. CONTRÔLE POSITIF : la rangée
trouvée doit être la même (±2 px) sur des colonnes voisines. CONTRÔLE NÉGATIF :
la même recherche sous le trait (plage y sans reflet) doit ne rien trouver.
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"


def is_lisere(p):
    r, g, b = p
    return abs(r - 42) < 14 and abs(g - 53) < 14 and abs(b - 72) < 16


def runs(im, y, x0, x1, pred):
    px = im.load()
    out, cur = [], None
    for x in range(x0, x1):
        if pred(px[x, y]):
            cur = [x, x] if cur is None else [cur[0], x]
        elif cur:
            out.append(tuple(cur)); cur = None
    if cur:
        out.append(tuple(cur))
    return out


def cyan_score(p):
    r, g, b = p
    return min(g, b) - r


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    print(f"REF {REF} {ref.size}   CAP {CAP} {cap.size}")

    print("\n(a) PLAQUE DU TITRE — liserés #2A3648 sur une ligne horizontale")
    print("  REF y=470 (milieu du titre)  :", runs(ref, 470, 20, 880, is_lisere))
    print("  JEU y=120 (milieu du titre)  :", runs(cap, 120, 20, 1060, is_lisere))
    print("  REF y=430 (au-dessus du titre):", runs(ref, 430, 20, 880, is_lisere))
    print("  JEU y=60  (au-dessus du titre):", runs(cap, 60, 20, 1060, is_lisere))
    print("  [ctrl +] REF y=630 (tuiles compteurs) :", runs(ref, 630, 20, 880, is_lisere))
    print("  [ctrl +] JEU y=320 (tuiles compteurs) :", runs(cap, 320, 20, 1060, is_lisere))
    print("  [ctrl -] REF y=1000 x 200..400 (aplat) :", runs(ref, 1000, 200, 400, is_lisere))
    print("  [ctrl -] JEU y=700 x 200..400 (aplat)  :", runs(cap, 700, 200, 400, is_lisere))

    print("\n(b) REFLET — pour chaque colonne, la rangée la plus cyan et son score")
    for nom, im, y0, y1, cols in (
            ("REF", ref, 860, 960, [30, 50, 90, 200, 300, 410, 430, 500, 700, 850, 870]),
            ("JEU", cap, 590, 700, [30, 55, 90, 200, 350, 490, 500, 520, 600, 850, 1030, 1050])):
        print(f"  --- {nom} ---")
        px = im.load()
        for x in cols:
            best = max(range(y0, y1), key=lambda y: cyan_score(px[x, y]))
            print(f"    x={x:>5}  y={best}  score={cyan_score(px[x,best]):>4}  {px[x,best]}"
                  + ("   <-- reflet visible" if cyan_score(px[x, best]) >= 8 else "   (pas de reflet)"))
        print(f"    [ctrl -] même recherche 200 px plus bas, x=200 : ", end="")
        best = max(range(y1 + 150, y1 + 250), key=lambda y: cyan_score(px[200, y]))
        print(f"y={best} score={cyan_score(px[200,best])} (attendu < 8)")


main()
