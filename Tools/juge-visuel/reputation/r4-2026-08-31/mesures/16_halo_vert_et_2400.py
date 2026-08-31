#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 et 5 — (a) le HALO VERT du bas de la capture : étendue et intensité,
mesurées par l'indice « verdeur » = G - (R+B)/2 ; (b) la géométrie de la
capture 1080x2400 (cible téléphone) : où passe la hauteur supplémentaire.

CONTRÔLE POSITIF (a) : la verdeur du HAUT de l'écran doit être quasi la même
dans la référence et la capture (même token de fond, mesuré par 05) ; si elle
ne l'était pas, l'écart mesuré en bas ne prouverait rien.
CONTRÔLE NÉGATIF (a) : la verdeur du texte VERT « Il vous écoute » doit être
franchement positive dans les DEUX images — c'est ce qui prouve que l'indice
sait détecter du vert quand il y en a.
(b) : contrôle positif = la carte du portrait doit avoir exactement la même
bbox en 1080x1920 et en 1080x2400 (rien ne doit bouger au-dessus du bloc
élastique).
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
C24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def med(im, cx, cy, r=3):
    px = im.load()
    v = sorted((px[x, y] for x in range(cx - r, cx + r + 1)
                for y in range(cy - r, cy + r + 1)), key=lum)
    return v[len(v) // 2]


def verdeur(p):
    return round(p[1] - (p[0] + p[2]) / 2.0, 1)


def is_gold(p):
    r, g, b = p
    return r > 120 and r - b > 40 and g > b


def groups(v, gap=4):
    if not v:
        return []
    g = [[v[0]]]
    for x in v[1:]:
        if x - g[-1][-1] <= gap:
            g[-1].append(x)
        else:
            g.append([x])
    return [(a[0], a[-1]) for a in g]


def gold_rows(im, x0, x1, y0, y1, frac=0.6):
    px = im.load()
    xs = list(range(x0, x1, 2))
    return groups([y for y in range(y0, y1)
                   if sum(1 for x in xs if is_gold(px[x, y])) >= frac * len(xs)])


def lisere_rows(im, x0, x1, y0, y1, frac=0.6):
    px = im.load()
    xs = list(range(x0, x1, 2))
    ok = lambda p: abs(p[0] - 42) < 14 and abs(p[1] - 53) < 14 and abs(p[2] - 72) < 16
    return groups([y for y in range(y0, y1)
                   if sum(1 for x in xs if ok(px[x, y])) >= frac * len(xs)])


def main():
    ref = Image.open(REF).convert("RGB")
    cap = Image.open(CAP).convert("RGB")
    c24 = Image.open(C24).convert("RGB")
    print(f"REF {REF} {ref.size}")
    print(f"CAP {CAP} {cap.size}")
    print(f"C24 {C24} {c24.size}")

    print("\n(a) VERDEUR du fond, sur l'axe médian, en fraction de la hauteur du "
          "panneau racine (réf 377..1730, jeu 19..1900)")
    print(f"{'f':>5} {'réf':>18} {'V':>6} {'jeu':>18} {'V':>6}")
    for i in range(11):
        f = i / 10.0
        yr = min(max(int(377 + f * 1353), 5), 1746)
        yc = min(max(int(19 + f * 1881), 5), 1914)
        a, b = med(ref, 8, yr), med(cap, 8, yc)
        print(f"{f:>5.1f} {str(a):>18} {verdeur(a):>6} {str(b):>18} {verdeur(b):>6}")
    print("  bande sous le panneau racine, axe médian :")
    a, b = med(ref, 450, 1745), med(cap, 540, 1912)
    print(f"     réf {a} V={verdeur(a)}   jeu {b} V={verdeur(b)}")
    print(f"  [ctrl positif] haut de l'écran : réf V={verdeur(med(ref,8,382))} "
          f"jeu V={verdeur(med(cap,8,24))} (doivent être proches)")
    print(f"  [ctrl négatif inversé] texte vert « Il vous écoute » : "
          f"réf V={verdeur(med(ref,200,1208))} jeu V={verdeur(med(cap,230,978))} "
          f"(doit être franchement > 0 dans les deux)")

    print("\n(b) 1080x2400 — repères")
    for lib, im in (("1080x1920", cap), ("1080x2400", c24)):
        h = im.size[1]
        gr = gold_rows(im, 108, 972, 0, h, 0.8)
        cardr = gold_rows(im, 150, 450, 300, h, 0.6)
        panneau = lisere_rows(im, 700, 1000, 380, h, 0.5)
        print(f"  --- {lib} : filets dorés {gr}")
        print(f"      carte portrait (rangées dorées) {cardr[:2]}")
        print(f"      bords du grand panneau (liseré) {panneau[:1]} … {panneau[-1:]}")
    # calcul du vide
    for lib, im, cardbot, panbot in (("1080x1920", cap, None, None),
                                     ("1080x2400", c24, None, None)):
        h = im.size[1]
        cardr = gold_rows(im, 150, 450, 300, h, 0.6)
        panneau = lisere_rows(im, 700, 1000, 380, h, 0.5)
        cb = cardr[1][1]
        pb = panneau[-1][0]
        print(f"  {lib} : bas de la carte y={cb}, bas du grand panneau y={pb} "
              f"→ vide = {pb-cb} px = {round((pb-cb)/3.6,1)} px CSS")


main()
