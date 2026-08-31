#!/usr/bin/env python3
"""Mesures d'appoint, chacune citee dans le rapport :
 (a) hauteur de capitale sur un GLYPHE ISOLE ('L' de Le miroir, 'D' de DONNER) —
     remplace la mesure en bande de 14/15, faussee par les accents ;
 (b) bords lateraux de la colonne des cartes de regle, sur une rangee sans texte ;
 (c) padding horizontal interieur de la grande carte, gauche ET droite ;
 (d) couleur du filet d'une carte de regle.
Contrôle positif : (c) doit trouver le MEME padding a gauche et a droite sur la
MEME image — un instrument qui rendrait deux valeurs differentes la mesurerait mal.
Contrôle negatif : (b) sur une rangee du VIDE sous la carte du portrait ne doit
trouver aucune carte."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
#              path,  s, ytop, rangee sans texte dans une carte, x du filet gauche de cette carte
GEO = {"REF": (REF, 3.0, 381, 208.0, 151.3), "CAP": (CAP, 3.6, 24, 194.0, 148.4)}
GLYPHES = [("L de 'Le miroir'", 88, 101, 10, 32), ("D de 'DONNER'", 63, 76, 420, 438)]


def runs(v, gap=4):
    o = []
    for x in v:
        if o and x - o[-1][-1] <= gap:
            o[-1].append(x)
        else:
            o.append([x])
    return [(q[0], q[-1]) for q in o]


for name in ("REF", "CAP"):
    path, s, ytop, ycarte, xfilet = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()

    for lab, x0, x1, y0, y1 in GLYPHES:
        X0, X1, Y0, Y1 = int(x0 * s), int(x1 * s), ytop + int(y0 * s), ytop + int(y1 * s)
        ys = [y for y in range(Y0, Y1) for x in range(X0, X1) if sum(p[x, y]) / 3.0 > 70]
        print("  %s (a) %-18s capitale = %.2f css (y_local %.1f..%.1f)" % (
            name, lab, (max(ys) - min(ys) + 1) / s, (min(ys) - ytop) / s, (max(ys) - ytop) / s))

    def segments(yc):
        y = ytop + int(yc * s)
        on = [x for x in range(int(5 * s), int(296 * s)) if sum(p[x, y]) / 3.0 > 22]
        return [q for q in runs(on) if (q[1] - q[0]) / s > 0.4]

    r = segments(ycarte)
    print("  %s (b) rangee y_local %.0f : %s" % (
        name, ycarte, [(round(a / s, 1), round(b / s, 1)) for a, b in r]))
    # r[0] = filet du cadre ; r[1] = filet gauche de la grande carte ;
    # r[-1] = filet du cadre ; r[-2] = filet droit de la grande carte
    gcg, gcd = r[1][1], r[-2][0]
    col = max(r, key=lambda q: q[1] - q[0])          # le plus long run = colonne des cartes
    prt = [q for q in r if q[0] > gcg][0]            # 1er run apres le filet gauche = carte portrait
    print("      colonne des cartes de regle : x %.1f -> %.1f css (L = %.1f)" % (
        col[0] / s, col[1] / s, (col[1] - col[0] + 1) / s))
    print("      PADDING horizontal de la grande carte : GAUCHE %.2f css (filet %.1f -> portrait %.1f)"
          " | DROITE %.2f css (colonne %.1f -> filet %.1f)" % (
              (prt[0] - gcg) / s, gcg / s, prt[0] / s,
              (gcd - col[1]) / s, col[1] / s, gcd / s))

    v = segments(310.0)
    print("  %s CTRL- rangee y_local 310 (le vide) : %d segment(s) -> %s  (aucune carte attendue)" % (
        name, len(v), [(round(a / s, 1), round(b / s, 1)) for a, b in v]))

    print("  %s (d) couleur du filet de carte de regle (x %.1f css, y_local %.0f) : %s"
          "   (jeton #2a3648 = (42,54,72))" % (
              name, xfilet, ycarte, p[int(xfilet * s), ytop + int(ycarte * s)]))
