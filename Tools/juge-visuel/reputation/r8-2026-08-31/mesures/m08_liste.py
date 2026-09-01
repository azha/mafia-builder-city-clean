#!/usr/bin/env python3
"""m08 — colonne de droite : bbox des 4 cartes de regle, leurs hauteurs et leurs ecarts.
Detection par le LISERE de la carte (plus clair que le fond du panneau) le long d'une colonne
verticale prise a l'interieur de la colonne de droite. Repere m01, unites px CSS depuis le cadre.
Controle positif: on doit trouver EXACTEMENT 4 cartes des deux cotes.
Controle negatif: la meme detection dans la colonne du portrait (x=100) ne doit PAS trouver
4 cartes (il n'y en a qu'une) — imprime."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)


def cards(path, sc, left, top, xcss, y_from=105, y_to=318):
    im = Image.open(path).convert("RGB")
    px = im.load()
    x = int(left + xcss * sc)
    ys = range(int(top + y_from * sc), int(top + y_to * sc))
    lum = [(y, sum(sorted(px[x + d, y][i] for d in range(-3, 4))[3] for i in range(3)) / 3) for y in ys]
    base = sorted(v for _, v in lum)[len(lum) // 4]  # quartile bas = fond du panneau
    inside = [(y, v > base + 4) for y, v in lum]
    runs = []
    cur = None
    for y, ok in inside:
        if ok and cur is None:
            cur = y
        elif not ok and cur is not None:
            if (y - cur) / sc > 8:
                runs.append((round((cur - top) / sc, 1), round((y - 1 - top) / sc, 1)))
            cur = None
    if cur is not None:
        runs.append((round((cur - top) / sc, 1), round((ys[-1] - top) / sc, 1)))
    return im.size, base, runs


def horiz(path, sc, left, top, ycss, x_from=140, x_to=291):
    im = Image.open(path).convert("RGB")
    px = im.load()
    y = int(top + ycss * sc)
    xs = range(int(left + x_from * sc), int(left + x_to * sc))
    lum = [(x, sum(px[x, y][i] for i in range(3)) / 3) for x in xs]
    base = sorted(v for _, v in lum)[len(lum) // 4]
    on = [x for x, v in lum if v > base + 4]
    return (round((min(on) - left) / sc, 1), round((max(on) - left) / sc, 1)) if on else None


for n, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
    size, base, runs = cards(p, sc, l, t, 230)
    print(f"{n} {p.split('/')[-1]} {size} fond={base:.1f}")
    print(f"  cartes de regle (x=230 CSS) : {len(runs)} trouvees")
    prev = None
    for i, (a, b) in enumerate(runs, 1):
        gap = "" if prev is None else f"  ecart_precedent={a-prev:.1f}"
        print(f"    carte{i}: y {a} -> {b}   h={b-a:.1f}{gap}")
        prev = b
    # largeur horizontale d'une carte, au milieu de la carte 2
    if len(runs) >= 2:
        ym = (runs[1][0] + runs[1][1]) / 2
        print(f"  largeur carte2 (y={ym:.1f}) : {horiz(p, sc, l, t, ym)}")
    size2, base2, runs2 = cards(p, sc, l, t, 100)
    print(f"  [ctrl neg] meme detection colonne portrait x=100 : {len(runs2)} 'cartes' -> {runs2}")
