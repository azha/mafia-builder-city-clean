#!/usr/bin/env python3
"""m03 — portrait: bbox des traits (peau, cravate/plastron, bust, chapeau, montre) en px CSS
depuis le haut du cadre. Repere m01 (REF top=376/x3.0 ; CAP top=18/x3.6).
Controle positif: la couleur de la PEAU doit etre la meme des deux cotes (aplat, meme token).
Controle negatif: le masque 'peau' ne doit PAS attraper le fond du panneau (aire > 0 et < 15% de la carte)."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 376, 18)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)

# carte portrait (bordure doree) : x de 18 a ~ 140 CSS ; on restreint la fenetre
CARD = (6, 110, 145, 340)  # x0,y0,x1,y1 en CSS depuis le repere


def masks(path, sc, top, left):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    print(f"  {path.split('/')[-1]} {W}x{H}")
    def to_px(xc, yc):
        return int(left + xc * sc), int(top + yc * sc)
    x0, y0 = to_px(CARD[0], CARD[1]); x1, y1 = to_px(CARD[2], CARD[3])
    res = {}
    tests = {
        "peau":   lambda r, g, b: 170 < r < 225 and 160 < g < 215 and 130 < b < 190 and r > b + 25,
        "plastron": lambda r, g, b: r > 225 and g > 220 and b > 195,
        "sombre": lambda r, g, b: r < 40 and g < 40 and b < 45,
    }
    for name, f in tests.items():
        pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if f(*px[x, y][:3])]
        if not pts:
            res[name] = None
            continue
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        bb = (round((min(xs) - left) / sc, 1), round((min(ys) - top) / sc, 1),
              round((max(xs) - left) / sc, 1), round((max(ys) - top) / sc, 1))
        res[name] = (bb, len(pts), round(len(pts) / sc / sc, 0))
    return im, px, res, (x0, y0, x1, y1)


def med(px, cx, cy, n=5):
    v = [px[cx + dx, cy + dy] for dx in range(-n, n + 1) for dy in range(-n, n + 1)]
    return tuple(sorted(c[i] for c in v)[len(v) // 2] for i in range(3))


for name, (p, sc, top, left) in (("REF", REF), ("CAP", CAP)):
    im, px, res, box = masks(p, sc, top, left)
    print(f"  {name} fenetre carte px={box}")
    for k, v in res.items():
        if v is None:
            print(f"    {k:9s} ABSENT")
        else:
            bb, n, css = v
            print(f"    {k:9s} bbox CSS={bb}  l={bb[2]-bb[0]:.1f} h={bb[3]-bb[1]:.1f}  aire_css={css}")
    # echantillon couleur peau au centre du visage
    if res["peau"]:
        bb = res["peau"][0]
        cx = int(left + (bb[0] + bb[2]) / 2 * sc); cy = int(top + (bb[1] + bb[3]) / 2 * sc)
        print(f"    couleur peau (mediane 11x11 au centre) = {med(px, cx, cy)}")
