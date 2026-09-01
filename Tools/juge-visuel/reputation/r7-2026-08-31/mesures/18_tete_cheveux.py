#!/usr/bin/env python3
"""Tete + chevelure. Le SVG dessine la chevelure comme un CROISSANT dont le bord
INFERIEUR est concave (M18 26 C.. C.. C40 20 36 21 31 21 C26 21 21 21 18 26 Z) :
au centre elle remonte a y=21, sur les cotes elle descend a y=26. Donc, mesuree
en largeur par rangee, la chevelure est LARGE en haut et se creuse au milieu.
On mesure : le profil de largeur de la chevelure rangee par rangee, et la
presence du LISERE sombre autour de la tete (stroke fond, 2 unites).
Contrôle positif : sur la reference le liseré de la tete doit etre trouve.
Contrôle negatif : au centre de la joue, aucun liseré."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
#              path,  s, ytop, x0,x1 (css), y0,y1 (css_local) autour de la tete
GEO = {"REF": (REF, 3.0, 381, 55, 110, 158, 240),
       "CAP": (CAP, 3.6, 24, 48, 105, 148, 232)}
CARTE2 = (22, 25, 27)
CREME2 = (185, 173, 146)


def near(c, t, tol=6):
    return all(abs(c[i] - t[i]) <= tol for i in range(3))


for name in ("REF", "CAP"):
    path, s, ytop, x0c, x1c, y0c, y1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    x0, x1 = int(x0c * s), int(x1c * s)
    # haut de la tete (creme2)
    tete = [(x, y) for y in range(ytop + int(y0c * s), ytop + int(y1c * s))
            for x in range(x0, x1) if near(p[x, y], CREME2)]
    ty = min(b for _, b in tete)
    txs = [a for a, _ in tete]
    print("  %s tete (creme2) : haut y_local %.1f css | x %.1f -> %.1f css" % (
        name, (ty - ytop) / s, min(txs) / s, max(txs) / s))
    print("  %s profil de largeur de la CHEVELURE (carte2), rangee par rangee :" % name)
    prof = []
    for yl in [y0c + i for i in range(0, int(y1c - y0c))]:
        y = ytop + int(yl * s)
        xs = [x for x in range(x0, x1) if near(p[x, y], CARTE2)]
        if xs:
            prof.append((yl, len(xs) / s, min(xs) / s, max(xs) / s))
    for t in prof[:22]:
        print("      y_local %5.1f : %5.1f css de carte2 | x %.1f -> %.1f" % t)
    if prof:
        larg = [t[1] for t in prof[:18]]
        print("  %s   largeur MAX de la chevelure = %.1f css, MIN sur les 18 1res rangees = %.1f css, "
              "creux relatif = %.2f" % (name, max(larg), min(larg), min(larg) / max(larg)))
    # liseré autour de la tete : profil horizontal a mi-hauteur du visage
    ym = ty + int(18 * s)
    print("  %s profil horizontal a y_local %.1f (mi-visage), de l'exterieur vers la joue :" % (
        name, (ym - ytop) / s))
    prev = None
    for x in range(x0, x0 + int(30 * s)):
        c = p[x, ym]
        if c != prev:
            print("      x=%6.2f css  rgb=%s" % (x / s, c))
        prev = c
