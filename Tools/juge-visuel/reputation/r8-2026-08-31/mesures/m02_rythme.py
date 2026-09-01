#!/usr/bin/env python3
"""m02 — rythme vertical: frontieres detectees le long d'une colonne, exprimees en px CSS
comptes DEPUIS LE HAUT DU CADRE (repere commun, cf m01).
Repere (m01): REF cadre top=376px (x3.0) ; CAP cadre top=18px (x3.6).
Controle positif: le haut du cadre doit tomber a 0.0 des deux cotes (par construction) et
le BAS du cadre a ~452 des deux cotes.
Controle negatif: la meme liste en px BRUTS doit differer (facteur 1.2)."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18)


def edges(path, sc, top, xcss, thr=14):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    x = int(round(xcss * sc))
    out = []
    prev = None
    for y in range(int(top), H):
        # mediane sur 5 px horizontaux pour tuer le bruit
        s = sorted(px[x + d, y] for d in (-2, -1, 0, 1, 2))[2]
        if prev is not None:
            d = sum(abs(a - b) for a, b in zip(s, prev))
            if d > thr:
                out.append(round((y - top) / sc, 1))
        prev = s
    return im.size, out


def compress(lst, tol=1.2):
    r = []
    for v in lst:
        if not r or v - r[-1][-1] > tol:
            r.append([v])
        else:
            r[-1].append(v)
    return [round(sum(g) / len(g), 1) for g in r]


for xcss in (150.0, 30.0, 95.0):
    print(f"=== colonne x={xcss} px CSS ===")
    for name, (p, sc, top) in (("REF", REF), ("CAP", CAP)):
        size, e = edges(p, sc, top, xcss)
        print(f"  {name} {p.split('/')[-1]} {size}")
        print(f"   {compress(e)}")
