#!/usr/bin/env python3
"""Le portrait (angle mort A7). Mesure les formes par leur COULEUR DE JETON :
  creme2 #b9ad92 = tete + cou   |  creme #eae0c8 = col (triangle)
  carte2 #16191b = buste + cheveux |  rang #232a2d = gant
Toutes les bbox sont ramenees en unites du viewBox SVG (62 x 78), via la
largeur du portrait declaree par la maquette (96 css de large, 119 de haut).
Contrôle positif : la couleur trouvee doit etre EXACTEMENT le jeton (ecart <= 3/255).
Contrôle negatif : une couleur absente (magenta) doit donner 0 pixel."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
# zone de recherche = interieur de la carte du portrait (css_local), mesuree en 09
GEO = {"REF": (REF, 3.0, 381, 24.0, 140.0, 118.0, 299.0),
       "CAP": (CAP, 3.6, 24, 21.0, 137.0, 116.0, 287.0)}
JET = {"creme2": (185, 173, 146), "creme": (234, 224, 200),
       "carte2": (22, 25, 27), "rang": (35, 42, 45), "CTRL-magenta": (255, 0, 255)}


def near(c, t, tol=3):
    return all(abs(c[i] - t[i]) <= tol for i in range(3))


for name in ("REF", "CAP"):
    path, s, ytop, x0c, x1c, y0c, y1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    X0, X1 = int(x0c * s), int(x1c * s)
    Y0, Y1 = ytop + int(y0c * s), ytop + int(y1c * s)
    res = {}
    for k, t in JET.items():
        pts = [(x, y) for y in range(Y0, Y1) for x in range(X0, X1) if near(p[x, y], t)]
        if not pts:
            print("  %s %-13s : 0 pixel" % (name, k)); continue
        xs = [a for a, _ in pts]; ys = [b for _, b in pts]
        bb = (min(xs), min(ys), max(xs), max(ys))
        res[k] = (bb, len(pts))
        print("  %s %-13s : n=%6d | x %.1f->%.1f css | y_local %.1f->%.1f css | "
              "L=%.1f H=%.1f css | remplissage aire/boite = %.3f" % (
                  name, k, len(pts), bb[0] / s, bb[2] / s, (bb[1] - ytop) / s, (bb[3] - ytop) / s,
                  (bb[2] - bb[0] + 1) / s, (bb[3] - bb[1] + 1) / s,
                  len(pts) / float((bb[2] - bb[0] + 1) * (bb[3] - bb[1] + 1))))
    # tete seule : la plus grande composante creme2 par ligne -> largeur max
    if "creme2" in res:
        bb = res["creme2"][0]
        larg = {}
        for y in range(bb[1], bb[3] + 1):
            n = sum(1 for x in range(X0, X1) if near(p[x, y], JET["creme2"]))
            larg[y] = n
        ymax = max(larg, key=lambda y: larg[y])
        print("     %s tete : largeur max %.1f css a y_local %.1f" % (name, larg[ymax] / s, (ymax - ytop) / s))
    # cheveux : le carte2 AU-DESSUS de la tete
    if "carte2" in res and "creme2" in res:
        ytete = res["creme2"][0][1]
        pts = [(x, y) for y in range(Y0, ytete + int(6 * s)) for x in range(X0, X1)
               if near(p[x, y], JET["carte2"])]
        if pts:
            xs = [a for a, _ in pts]; ys = [b for _, b in pts]
            print("     %s CHEVEUX (carte2 au-dessus du haut de la tete) : x %.1f->%.1f css, "
                  "y_local %.1f->%.1f css, L=%.1f H=%.1f" % (
                      name, min(xs) / s, max(xs) / s, (min(ys) - ytop) / s, (max(ys) - ytop) / s,
                      (max(xs) - min(xs) + 1) / s, (max(ys) - min(ys) + 1) / s))
            # trou entre le bas des cheveux et le haut de la tete, sur l'axe median
            xm = (min(xs) + max(xs)) // 2
            colc = [y for y in range(Y0, Y1) if near(p[xm, y], JET["carte2"])]
            colt = [y for y in range(Y0, Y1) if near(p[xm, y], JET["creme2"])]
            if colc and colt:
                bas_cheveux = max(y for y in colc if y < min(colt))
                print("     %s axe median x=%.1f css : bas des cheveux y_local %.1f, "
                      "haut de la tete y_local %.1f => ECART %.1f css" % (
                          name, xm / s, (bas_cheveux - ytop) / s, (min(colt) - ytop) / s,
                          (min(colt) - bas_cheveux) / s))
