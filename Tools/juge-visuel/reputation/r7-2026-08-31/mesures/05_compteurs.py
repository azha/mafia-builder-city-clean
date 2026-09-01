#!/usr/bin/env python3
"""Les trois compteurs : bbox des tuiles, bbox de l'encre du chiffre,
couleur du chiffre. Verifie le PERIMETRE de l'ecart assume 'ENFREINTES = tiret' :
le tiret doit avoir la COULEUR et la POSITION des deux autres chiffres.
Contrôle positif : la couleur du chiffre 1 et du chiffre 2 doit etre identique
sur la MEME image. Contrôle negatif : la couleur du libelle (gris) doit differer."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
# bandes verticales de la rangee des compteurs (css_local), issues de 03_rythme
GEO = {"REF": (REF, 3.0, 381, 18, 881, 68.0, 110.0), "CAP": (CAP, 3.6, 24, 18, 1061, 66.1, 108.3)}


def med(vals):
    v = sorted(vals)
    return v[len(v) // 2]


for name in ("REF", "CAP"):
    path, s, ytop, xl, xr, y0c, y1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    y0, y1 = ytop + int(y0c * s), ytop + int(y1c * s)
    W = xr - xl
    for i in range(3):
        # tiers de la rangee, avec marge
        ax = xl + int(W * i / 3.0) + int(6 * s)
        bx = xl + int(W * (i + 1) / 3.0) - int(6 * s)
        # encre = pixels clairs (chiffre) dans la moitie haute de la tuile
        ys = range(y0 + int(3 * s), y0 + int(26 * s))
        px = [(x, y) for y in ys for x in range(ax, bx) if sum(p[x, y]) > 420]
        if not px:
            print("  %s tuile %d : AUCUNE ENCRE CLAIRE" % (name, i)); continue
        X = [a for a, _ in px]; Y = [b for _, b in px]
        # couleur = median des pixels les plus clairs (coeur du glyphe)
        px.sort(key=lambda t: -sum(p[t[0], t[1]]))
        core = px[:max(20, len(px) // 6)]
        cols = [p[x, y] for x, y in core]
        col = (med([c[0] for c in cols]), med([c[1] for c in cols]), med([c[2] for c in cols]))
        print("  %s tuile %d : encre x %.1f->%.1f css, y_local %.1f->%.1f css, "
              "hauteur %.1f css, centre_x %.1f css, couleur %s" % (
                  name, i, min(X) / s, max(X) / s, (min(Y) - ytop) / s, (max(Y) - ytop) / s,
                  (max(Y) - min(Y) + 1) / s, (min(X) + max(X)) / 2.0 / s, col))
    # CTRL- : couleur du libelle gris de la tuile 0
    ax = xl + int(6 * s); bx = xl + int(W / 3.0) - int(6 * s)
    lab = [p[x, y] for y in range(y0 + int(27 * s), y0 + int(40 * s)) for x in range(ax, bx)
           if sum(p[x, y]) > 420]
    lab.sort(key=lambda c: -sum(c))
    lab = lab[:max(10, len(lab) // 6)]
    print('  CTRL- couleur libelle tuile 0 :', (med([c[0] for c in lab]), med([c[1] for c in lab]), med([c[2] for c in lab])) if lab else 'vide')
