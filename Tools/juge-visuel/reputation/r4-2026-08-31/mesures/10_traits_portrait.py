#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 3 — les traits du portrait un par un (angle mort A7 déclaré) :
montre, col, plastron, teinte de la veste, et le trait clair sous le col.
Tout en % de la CARTE (invariant d'échelle).

Le masque MONTRE est la teinte échantillonnée sur place (réf (35,42,45),
jeu (34,42,46)) à ±5 — pas un intervalle large : un masque large attrapait le
liseré de la veste et ratait son contrôle négatif.

CONTRÔLE POSITIF : la MONTRE existe dans les DEUX images (on la voit) ; le
masque doit la trouver dans les deux, dans la moitié gauche du buste.
CONTRÔLE NÉGATIF : le même masque dans la moitié DROITE du buste doit rendre
une aire < 5 % de celle trouvée à gauche (il n'y a pas de montre à droite).
"""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r4-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CARTE = {"REF": (72, 735, 420, 1277), "JEU": (75, 439, 493, 1058)}
MONTRE_TEINTE = {"REF": (35, 42, 45), "JEU": (34, 42, 46)}


def lum(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def stats(im, box, pred):
    px = im.load()
    x0, y0, x1, y1 = box
    xs, ys, n = [], [], 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(px[x, y]):
                xs.append(x); ys.append(y); n += 1
    return None if not n else (min(xs), min(ys), max(xs), max(ys), n)


def median(im, cx, cy, r=3):
    px = im.load()
    v = [px[x, y] for x in range(cx - r, cx + r + 1) for y in range(cy - r, cy + r + 1)]
    v.sort(key=lum)
    return v[len(v) // 2]


def near(c, t):
    return lambda p: all(abs(p[i] - c[i]) <= t for i in range(3))


COL = near((234, 224, 200), 10)
PLASTRON = near((185, 173, 146), 10)


def main():
    for nom, path in (("REF", REF), ("JEU", CAP)):
        im = Image.open(path).convert("RGB")
        px = im.load()
        x0, y0, x1, y1 = CARTE[nom]
        W, H = x1 - x0, y1 - y0
        cx = (x0 + x1) // 2
        P = lambda v, o, t: round(100.0 * (v - o) / t, 1)
        print("=" * 74)
        print(f"{nom} {path} {im.size}   carte {W}x{H} px")

        M = near(MONTRE_TEINTE[nom], 5)
        by0, by1 = y0 + int(0.62 * H), y0 + int(0.95 * H)
        mg = stats(im, (x0 + 3, by0, cx, by1), M)
        md = stats(im, (cx, by0, x1 - 3, by1), M)
        a, b, c, d, n = mg
        print(f"  MONTRE : x {P(a,x0,W)}%..{P(c,x0,W)}%  y {P(b,y0,H)}%..{P(d,y0,H)}%"
              f"  l={round(100*(c-a+1)/W,1)}%  h={round(100*(d-b+1)/H,1)}%"
              f"  aire={round(100.0*n/(W*H),3)}% de la carte")
        ng = n
        nd = md[4] if md else 0
        print(f"  [ctrl positif] trouvée dans les deux images, moitié gauche : aire={ng}px")
        print(f"  [ctrl négatif] même masque, moitié DROITE : {nd}px "
              f"= {round(100.0*nd/ng,1)}% de gauche (attendu < 5 %)")
        # cadran : y a-t-il, DANS la bbox de la montre, des pixels nettement plus clairs ?
        vals = sorted(lum(px[x, y]) for y in range(b, d + 1) for x in range(a, c + 1))
        clair = sum(1 for v in vals if v > lum(MONTRE_TEINTE[nom]) + 12)
        print(f"     pixels nettement plus clairs que le fond de la montre (cadran/aiguilles) :"
              f" {clair} soit {round(100.0*clair/len(vals),1)}%")

        cinfo = stats(im, (x0 + 3, y0 + int(0.55 * H), x1 - 3, y0 + int(0.85 * H)), COL)
        a2, b2, c2, d2, n2 = cinfo
        print(f"  COL : x {P(a2,x0,W)}%..{P(c2,x0,W)}%  y {P(b2,y0,H)}%..{P(d2,y0,H)}%  "
              f"l={round(100*(c2-a2+1)/W,1)}%  h={round(100*(d2-b2+1)/H,1)}%  "
              f"aire/boîte={round(n2/((c2-a2+1)*(d2-b2+1)),3)}  "
              f"axe={round((P(a2,x0,W)+P(c2,x0,W))/2,1)}%")
        p_ = stats(im, (x0 + 3, y0 + int(0.50 * H), x1 - 3, y0 + int(0.70 * H)), PLASTRON)
        print(f"  PLASTRON : x {P(p_[0],x0,W)}%..{P(p_[2],x0,W)}%  "
              f"l={round(100*(p_[2]-p_[0]+1)/W,1)}%")
        print(f"  VESTE : épaule gauche {median(im, x0+int(0.30*W), y0+int(0.82*H))}"
              f"   épaule droite {median(im, x0+int(0.70*W), y0+int(0.82*H))}"
              f"   centre bas {median(im, x0+int(0.50*W), y0+int(0.88*H))}")

        # trait clair horizontal sous la pointe du col
        trouve = []
        for y in range(d2 - 4, y0 + int(0.85 * H)):
            xs = [x for x in range(x0 + int(0.20 * W), x0 + int(0.80 * W))
                  if lum(px[x, y]) > lum(px[x, y - 8]) + 40 and not COL(px[x, y])]
            if len(xs) > 0.10 * W:
                trouve.append((f"y={P(y,y0,H)}%", f"x {P(min(xs),x0,W)}%..{P(max(xs),x0,W)}%",
                               f"{len(xs)}px"))
        print(f"  TRAIT clair horizontal sous la pointe du col : "
              f"{trouve if trouve else 'AUCUN'}")


main()
