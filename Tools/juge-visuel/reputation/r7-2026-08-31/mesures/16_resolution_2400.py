#!/usr/bin/env python3
"""1080x2400 (cible telephone) : le cadre, ses reperes internes, et la question
'rien de coupe / rien hors cadre'. Tout en px CSS (1080 px = 300 css => s=3.6).
Contrôle positif : la largeur du cadre doit etre identique a celle du 16:9.
Contrôle negatif : la hauteur de l'IMAGE doit differer (1920 vs 2400)."""
from PIL import Image

A = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
B = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png"
S = 3.6


def gold(c):
    r, g, b = c
    return r > 140 and g > 110 and b < 120 and r - b > 60


def runs(v, gap=6):
    o = []
    for x in v:
        if o and x - o[-1][-1] <= gap:
            o[-1].append(x)
        else:
            o.append([x])
    return [(q[0], q[-1]) for q in o]


geo = {}
for name, path in (("16:9", A), ("20:9", B)):
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    W, H = im.size
    p = im.load()
    y = int(H * 0.5)
    xs = [x for x in range(W) if gold(p[x, y])]
    r = runs(xs)
    left, right = r[0][0], r[-1][1]
    ys = [yy for yy in range(H) if gold(p[left + 1, yy])]
    c = runs(ys, gap=8)
    top, bot = c[0][0], max(e for _, e in c)
    geo[name] = (left, right, top, bot, W, H)
    print("  %s CADRE : x %.1f -> %.1f css (largeur %.1f) | y %.1f -> %.1f css (hauteur %.1f)" % (
        name, left / S, right / S, (right - left) / S, top / S, bot / S, (bot - top) / S))
    print("  %s marges : gauche %.1f css, droite %.1f css, haut %.1f css, bas %.1f css" % (
        name, left / S, (W - right) / S, top / S, (H - bot) / S))
    # rien hors cadre : encre non-fond au-dessus / en dessous du cadre
    def encre(y0, y1):
        n = 0
        for yy in range(y0, y1):
            for x in range(0, W, 2):
                cc = p[x, yy]
                if sum(cc) / 3.0 > 42:
                    n += 1
        return n
    print("  %s encre AU-DESSUS du cadre (y 0..%d) : %d px | EN DESSOUS (y %d..%d) : %d px" % (
        name, top, encre(0, top), bot, H, encre(bot + 1, H)))
    # debordement lateral : encre a moins de 1 css des bords de l'image
    n = sum(1 for yy in range(0, H, 2) for x in list(range(0, 3)) + list(range(W - 3, W))
            if sum(p[x, yy]) / 3.0 > 42)
    print("  %s encre collee aux bords de l'image (<1 css) : %d px" % (name, n))

print("CTRL+ largeurs de cadre : %.2f css vs %.2f css" % (
    (geo["16:9"][1] - geo["16:9"][0]) / S, (geo["20:9"][1] - geo["20:9"][0]) / S))
print("CTRL- hauteurs d'image : %d vs %d px" % (geo["16:9"][5], geo["20:9"][5]))
