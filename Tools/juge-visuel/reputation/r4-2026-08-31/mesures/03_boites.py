#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 1/2/3 — bbox des boîtes majeures, en px ET en px CSS (réf /3.0,
capture /3.6), origine = bord haut intérieur du panneau racine.

Méthode : détection du liseré doré (carte du portrait, CTA, panneau racine) et
du liseré bleuté #2A3648 (plaques) le long de colonnes et de lignes choisies.

CONTRÔLE POSITIF : la largeur intérieure du panneau racine doit valoir ~287 CSS
dans les DEUX images (grandeur qu'on sait égale par construction, dossier
« largeur CSS déclarée 300 »).
CONTRÔLE NÉGATIF : le même détecteur de liseré doré appliqué à la plaque du
verdict (dont on SAIT qu'elle est bleutée, pas dorée) doit répondre « aucune
colonne dorée ».
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CAP24 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"


def is_gold(p):
    r, g, b = p
    return r > 120 and r - b > 40 and g > b


def is_lisere(p):
    r, g, b = p
    return abs(r - 42) < 14 and abs(g - 53) < 14 and abs(b - 72) < 16


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


def gold_rows_in(im, x0, x1, y0, y1, frac=0.6):
    px = im.load()
    xs = list(range(x0, x1, 2))
    return groups([y for y in range(y0, y1)
                   if sum(1 for x in xs if is_gold(px[x, y])) >= frac * len(xs)])


def gold_cols_in(im, y0, y1, x0, x1, frac=0.6):
    px = im.load()
    ys = list(range(y0, y1, 2))
    return groups([x for x in range(x0, x1)
                   if sum(1 for y in ys if is_gold(px[x, y])) >= frac * len(ys)])


def lisere_cols_in(im, y0, y1, x0, x1, frac=0.6):
    px = im.load()
    ys = list(range(y0, y1, 2))
    return groups([x for x in range(x0, x1)
                   if sum(1 for y in ys if is_lisere(px[x, y])) >= frac * len(ys)])


def lisere_rows_in(im, x0, x1, y0, y1, frac=0.6):
    px = im.load()
    xs = list(range(x0, x1, 2))
    return groups([y for y in range(y0, y1)
                   if sum(1 for x in xs if is_lisere(px[x, y])) >= frac * len(xs)])


def rap(name, path, k, root_top, root_bot, root_l, root_r):
    im = Image.open(path).convert("RGB")
    print("=" * 72)
    print(f"{name} {path} taille={im.size}  facteur x{k}")
    css = lambda v: round(v / k, 1)
    print(f"  panneau racine : x {root_l}..{root_r} = {css(root_r-root_l)} CSS de large "
          f"[ctrl positif, attendu ~287]")
    print(f"                   y {root_top}..{root_bot} = {css(root_bot-root_top)} CSS de haut")
    return im, css


def main():
    # ---------- RÉFÉRENCE ----------
    ref, cssr = rap("REF m-120", REF, 3.0, 377, 1730, 19, 880)
    card_c = gold_cols_in(ref, 800, 1200, 20, 500)
    card_r = gold_rows_in(ref, 120, 380, 700, 1345)
    print(f"  carte portrait : colonnes dorées {card_c}  rangées dorées {card_r}")
    # plaque du titre (liseré bleuté)
    pt_r = lisere_rows_in(ref, 100, 800, 380, 560, 0.7)
    pt_c = lisere_cols_in(ref, 420, 540, 20, 880, 0.6)
    print(f"  plaque du titre : rangées liseré {pt_r}  colonnes liseré {pt_c}")
    print(f"  [ctrl négatif] colonnes DORÉES sur la plaque du verdict "
          f"(y 1375..1595) : {gold_cols_in(ref, 1375, 1595, 20, 880)}  (attendu [])")

    # ---------- CAPTURE 1080x1920 ----------
    cap, cssc = rap("CAP 1080x1920", CAP, 3.6, 19, 1900, 19, 1060)
    card_c2 = gold_cols_in(cap, 600, 1000, 20, 600)
    card_r2 = gold_rows_in(cap, 150, 450, 400, 1370)
    print(f"  carte portrait : colonnes dorées {card_c2}  rangées dorées {card_r2}")
    pt_r2 = lisere_rows_in(cap, 100, 950, 22, 240, 0.7)
    pt_c2 = lisere_cols_in(cap, 40, 200, 20, 1060, 0.6)
    print(f"  plaque du titre : rangées liseré {pt_r2}  colonnes liseré {pt_c2}")
    print(f"  [ctrl négatif] colonnes DORÉES sur la plaque du verdict "
          f"(y 1410..1660) : {gold_cols_in(cap, 1410, 1660, 20, 1060)}  (attendu [])")

    # ---------- CAPTURE 1080x2400 ----------
    cap2 = Image.open(CAP24).convert("RGB")
    print("=" * 72)
    print(f"CAP 1080x2400 {CAP24} taille={cap2.size}")
    gr = gold_rows_in(cap2, 108, 972, 0, 2400, 0.8)
    print(f"  filets dorés pleine largeur : {gr}")
    print(f"  carte portrait : colonnes dorées {gold_cols_in(cap2, 700, 1000, 20, 600)}"
          f"  rangées dorées {gold_rows_in(cap2, 150, 450, 400, 1500)}")


main()
