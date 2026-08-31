#!/usr/bin/env python3
"""Textes principaux : hauteur de capitale (encre) et couleur, en px CSS.
Chaque texte est cherche dans une fenetre donnee ; l'encre = pixels dont la
luminance depasse le fond de la fenetre + marge.
Contrôle positif : la couleur du titre doit etre le jeton or_vif #f2c96b des
deux cotes. Contrôle negatif : une fenetre vide (fond) -> 0 px d'encre."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
S = {"REF": (REF, 3.0, 381), "CAP": (CAP, 3.6, 24)}
# nom : (x0,x1, y0_ref,y1_ref, y0_cap,y1_cap) en css / css_local
Z = [
    ("titre 'Le miroir'",        30, 260,  10, 30,   8, 28),
    ("sur-titre 'UN LIEUTENANT'", 30, 260,  32, 46,  30, 44),
    ("verdict 'Pas encore jug.'", 145, 255, 118, 140, 116, 138),
    ("legende 'ce qu'il a abs.'", 210, 285, 118, 140, 220, 250),
    ("carte 1 'col ouvert'",      170, 260, 155, 168, 145, 158),
    ("'Il vous ecoute'",           30, 135, 275, 292, 262, 278),
    ("titre 2 'Rien n'a...'",      25, 250, 336, 356, 340, 360),
    ("CTA 'DONNER UNE...'",        40, 260, 424, 436, 424, 436),
    ("CTRL- fenetre vide",         30, 100, 305, 315, 300, 312),
]


def med(v):
    v = sorted(v); return v[len(v) // 2]


for name in ("REF", "CAP"):
    path, s, ytop = S[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    for lab, x0c, x1c, ry0, ry1, cy0, cy1 in Z:
        y0c, y1c = (ry0, ry1) if name == "REF" else (cy0, cy1)
        x0, x1 = int(x0c * s), int(x1c * s)
        y0, y1 = ytop + int(y0c * s), ytop + int(y1c * s)
        vals = [sum(p[x, y]) / 3.0 for y in range(y0, y1) for x in range(x0, x1)]
        fond = med(vals)
        seuil = fond + 25
        pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if sum(p[x, y]) / 3.0 > seuil]
        if len(pts) < 20:
            print("  %s %-28s : encre absente (%d px, fond %.0f)" % (name, lab, len(pts), fond)); continue
        ys = [b for _, b in pts]; xs = [a for a, _ in pts]
        pts.sort(key=lambda t: -sum(p[t[0], t[1]]))
        core = pts[:max(15, len(pts) // 8)]
        cols = [p[x, y] for x, y in core]
        col = (med([c[0] for c in cols]), med([c[1] for c in cols]), med([c[2] for c in cols]))
        print("  %s %-28s : hauteur encre %5.2f css | x %.1f->%.1f css | couleur %s" % (
            name, lab, (max(ys) - min(ys) + 1) / s, min(xs) / s, max(xs) / s, col))
