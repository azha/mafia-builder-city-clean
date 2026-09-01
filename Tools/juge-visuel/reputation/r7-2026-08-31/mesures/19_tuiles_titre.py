#!/usr/bin/env python3
"""Panneau-titre et rangee des 3 compteurs : bords verticaux, largeurs, gouttieres.
Contrôle positif : les 3 tuiles doivent avoir la meme largeur SUR LA MEME image.
Contrôle negatif : la meme detection sur une rangee vide (le vide sous le cadre
n'existe pas ici, on prend l'interieur de la grande carte) -> pas 3 tuiles."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 18, 881, 90.0, 20.0, 300.0),
       "CAP": (CAP, 3.6, 24, 18, 1061, 88.0, 20.0, 300.0)}


def runs(v, gap=2):
    o = []
    for x in v:
        if o and x - o[-1][-1] <= gap:
            o[-1].append(x)
        else:
            o.append([x])
    return [(q[0], q[-1]) for q in o]


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr, ytuiles, ytitre, yvide = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    for lab, yc in (("rangee des compteurs", ytuiles), ("panneau-titre", ytitre),
                    ("CTRL- interieur grande carte", yvide)):
        y = ytop + int(yc * s)
        bords = [x for x in range(xl, xr) if sum(p[x, y]) / 3.0 > 34]
        r = runs(bords)
        print("  %s %-28s y_local %5.1f : %d bord(s) -> %s" % (
            name, lab, yc, len(r), [(round(a / s, 1), round(b / s, 1)) for a, b in r]))
        if lab == "rangee des compteurs" and len(r) >= 6:
            L = [(r[i + 1][1] - r[i][0]) / s for i in range(0, 6, 2)]
            G = [(r[i + 2][0] - r[i + 1][1]) / s for i in range(0, 4, 2)]
            print("      largeurs des 3 tuiles : %s css | gouttieres : %s css" % (
                [round(v, 1) for v in L], [round(v, 1) for v in G]))
