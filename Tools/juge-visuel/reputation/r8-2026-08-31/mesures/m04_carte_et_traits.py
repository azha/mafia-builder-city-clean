#!/usr/bin/env python3
"""m04 — carte portrait (bordure doree) + traits: chapeau, buste, montre.
Repere m01. Controle positif: la bordure doree de la carte doit avoir la meme couleur des deux
cotes. Controle negatif: le masque 'montre' ne doit rien trouver dans le QUART HAUT de la carte
(la montre est au poignet, en bas) — s'il y trouve quelque chose, le masque attrape autre chose."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 376, 18)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)


def is_gold(p):
    r, g, b = p[:3]
    return r > 150 and 110 < g < 210 and b < 130 and r - b > 60


def run(name, path, sc, top, left):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    print(f"{name}  {path.split('/')[-1]} {W}x{H}")
    # zone de recherche: colonne gauche du grand panneau, y CSS 110..340
    y0 = int(top + 112 * sc); y1 = int(top + 338 * sc)
    x0 = int(left + 8 * sc); x1 = int(left + 160 * sc)
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if is_gold(px[x, y])]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    cx0, cy0, cx1, cy1 = min(xs), min(ys), max(xs), max(ys)
    C = lambda v, o: round((v - o) / sc, 1)
    card = (C(cx0, left), C(cy0, top), C(cx1, left), C(cy1, top))
    print(f"  carte portrait bbox CSS = {card}  l={card[2]-card[0]:.1f} h={card[3]-card[1]:.1f}"
          f"  centre_x={(card[0]+card[2])/2:.1f}")
    # couleur bordure: mediane sur le bord gauche
    v = sorted((px[cx0 + 1, y] for y in range(cy0 + 20, cy0 + 60)), key=lambda c: sum(c))
    print(f"  couleur bordure (mediane) = {v[len(v)//2]}")

    # chapeau / cheveux: noir tres sombre a l'interieur de la carte, partie haute
    def bbox(f, ya, yb, xa=None, xb=None):
        xa = xa if xa is not None else cx0 + 3
        xb = xb if xb is not None else cx1 - 3
        p = [(x, y) for y in range(int(ya), int(yb)) for x in range(int(xa), int(xb)) if f(*px[x, y][:3])]
        if not p:
            return None, 0
        X = [q[0] for q in p]; Y = [q[1] for q in p]
        return (C(min(X), left), C(min(Y), top), C(max(X), left), C(max(Y), top)), len(p) / sc / sc

    noir = lambda r, g, b: r < 40 and g < 40 and b < 48
    bb, a = bbox(noir, cy0 + 3, cy1 - 3)
    print(f"  encre sombre (chapeau+buste) bbox CSS={bb} aire_css={a:.0f}")
    # chapeau seul: au-dessus du milieu du visage
    gris = lambda r, g, b: 90 < r < 175 and 90 < g < 175 and 90 < b < 175 and abs(r - g) < 22 and abs(g - b) < 30
    bb2, a2 = bbox(gris, cy0 + 3, cy1 - 3)
    print(f"  gris moyen (montre?) bbox CSS={bb2} aire_css={a2:.1f}")
    # controle negatif: quart haut de la carte
    bb3, a3 = bbox(gris, cy0 + 3, cy0 + (cy1 - cy0) // 4)
    print(f"  [ctrl neg] gris moyen dans le quart HAUT: bbox={bb3} aire_css={a3:.1f}")
    return card


for n, (p, sc, t, l) in (("REF", REF), ("CAP", CAP)):
    run(n, p, sc, t, l)
