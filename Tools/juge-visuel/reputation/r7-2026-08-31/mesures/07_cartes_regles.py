#!/usr/bin/env python3
"""Les 4 cartes de regles (colonne droite) : bords haut/bas de chaque carte,
hauteur et ecart, en px CSS. Detection par le LISERE de la carte sur une
colonne verticale passant au milieu de la carte.
Contrôle positif : la largeur de la colonne de cartes doit etre ~= des 2 cotes.
Contrôle negatif : la meme colonne mais dans la carte du portrait ne doit PAS
donner 4 cartes."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 18, 881), "CAP": (CAP, 3.6, 24, 18, 1061)}


def runs(vals, gap=2):
    out = []
    for v in vals:
        if out and v - out[-1][-1] <= gap:
            out[-1].append(v)
        else:
            out.append([v])
    return [(r[0], r[-1]) for r in out]


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    # x de la colonne droite : cherche les bords verticaux du liseré sur une
    # ligne qui traverse la 3e carte (css_local ~ 230)
    y = ytop + int(232 * s)
    lum = [(x, sum(p[x, y]) / 3.0) for x in range(xl, xr)]
    bords = [x for x, l in lum if l > 34]
    r = runs(bords, gap=2)
    r = [q for q in r if q[0] > xl + int(120 * s)]
    print("  %s ligne y_local=232 : bords verticaux droite ->" % name,
          [(round(a / s, 1), round(b / s, 1)) for a, b in r][:6])
    if len(r) >= 2:
        gcx = (r[0][0] + r[-1][1]) / 2.0
        print("  %s colonne cartes : x %.1f -> %.1f css, largeur %.1f css" % (
            name, r[0][0] / s, r[-1][1] / s, (r[-1][1] - r[0][0]) / s))
    else:
        gcx = xr - int(60 * s)
    x = int(gcx)
    # profil vertical le long de x : les liseres horizontaux
    col = [(yy, sum(p[x, yy]) / 3.0) for yy in range(ytop + int(120 * s), ytop + int(310 * s))]
    pics = [yy for yy, l in col if l > 34]
    rr = runs(pics, gap=2)
    print("  %s x=%.1f css : liseres horizontaux (y_local css) ->" % (name, x / s))
    prev_bot = None
    for a, b in rr:
        print("      %6.1f -> %6.1f  (ep %.1f)" % ((a - ytop) / s, (b - ytop) / s, (b - a + 1) / s))
    # regrouper en cartes : paires successives
    ys = [((a - ytop) / s, (b - ytop) / s) for a, b in rr]
    for i in range(0, len(ys) - 1, 2):
        h = ys[i + 1][1] - ys[i][0]
        gap = ys[i + 2][0] - ys[i + 1][1] if i + 2 < len(ys) else None
        print("      => carte %d : hauteur %.1f css, ecart au suivant %s" % (
            i // 2 + 1, h, ("%.1f css" % gap) if gap is not None else "-"))
    # CTRL- : meme profil dans la carte du portrait (colonne gauche)
    xg = xl + int(70 * s)
    colg = [yy for yy in range(ytop + int(120 * s), ytop + int(310 * s)) if sum(p[xg, yy]) / 3.0 > 34]
    print("  CTRL- colonne portrait x=%.1f css : %d segments" % (xg / s, len(runs(colg, gap=2))))
