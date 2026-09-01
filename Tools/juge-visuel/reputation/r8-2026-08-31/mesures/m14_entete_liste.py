#!/usr/bin/env python3
"""m14 — l'en-tete de la colonne de droite : le sur-titre 'Pas encore jugeable' et la legende
'ce qu'il a absorbe de vos regles'. bbox d'encre, nombre de lignes, alignement.
Repere m01, unites CSS depuis le cadre.
Controle positif: le sur-titre 'Pas encore jugeable' doit commencer au meme x (a 2 CSS pres).
Controle negatif: une fenetre prise SOUS l'en-tete (dans la 1re carte) doit rendre un nombre de
lignes different de celui de la legende."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)


def lines(path, sc, left, top, win, thr=48):
    im = Image.open(path).convert("RGB"); px = im.load()
    x0 = int(left + win[0] * sc); y0 = int(top + win[1] * sc)
    x1 = int(left + win[2] * sc); y1 = int(top + win[3] * sc)
    runs = []; cur = None; xmin = 10**9; xmax = -1
    for y in range(y0, y1):
        xs = [x for x in range(x0, x1) if sum(px[x, y][:3]) / 3 > thr]
        if xs:
            xmin = min(xmin, min(xs)); xmax = max(xmax, max(xs))
        if xs and cur is None:
            cur = y
        elif not xs and cur is not None:
            if y - cur > sc:
                runs.append((round((cur - top) / sc, 1), round((y - top) / sc, 1)))
            cur = None
    if cur is not None:
        runs.append((round((cur - top) / sc, 1), round((y1 - top) / sc, 1)))
    bb = None if xmax < 0 else (round((xmin - left) / sc, 1), round((xmax - left) / sc, 1))
    return im.size, runs, bb


WINS = {
    "sur-titre 'Pas encore jugeable'": ((146, 111, 216, 140), (144, 108, 216, 138)),
    "legende 'ce qu'il a absorbe...'": ((217, 111, 291, 152), (215, 108, 291, 142)),
    "[ctrl neg] interieur carte 1":    ((160, 156, 291, 180), (158, 145, 291, 168)),
}
for lbl, (wr, wc) in WINS.items():
    print(lbl)
    for n, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
        win = wr if n == "REF" else wc
        s, r, bb = lines(p, sc, l, t, win)
        print(f"  {n} {p.split('/')[-1]} {s} : {len(r)} ligne(s) {r}  x_encre={bb}")
