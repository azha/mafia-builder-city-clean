#!/usr/bin/env python3
"""Le buste : (a) presence du LISERE sombre autour du dome (SVG : stroke fond
#0b1016, 2 unites) ; (b) le trait horizontal parasite sous la pointe du col ;
(c) couleur de remplissage du dome.
Contrôle positif : sur la REFERENCE le profil doit montrer fond -> liseré ->
carte2 (l'instrument sait voir un liseré quand il y en a un).
Contrôle negatif : le meme profil au milieu du dome (loin du bord) ne doit
montrer aucun liseré."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
#              path,   s,  ytop, y_local du flanc du dome, x de depart, sens
GEO = {"REF": (REF, 3.0, 381, 250.0, 40.0, 82.0), "CAP": (CAP, 3.6, 24, 244.0, 32.0, 75.5)}

for name in ("REF", "CAP"):
    path, s, ytop, yc, x0c, xmid = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    y = ytop + int(yc * s)
    print("  %s (a) profil horizontal a y_local %.0f, du fond vers le dome :" % (name, yc))
    prev = None
    for x in range(int(x0c * s), int((x0c + 22) * s)):
        c = p[x, y]
        if c != prev:
            print("      x=%6.2f css  rgb=%s" % (x / s, c))
        prev = c
    print("  %s CTRL- milieu du dome (x %.0f css) : rgb=%s" % (name, xmid, p[int(xmid * s), y]))
    # (b) trait parasite : ligne la plus claire dans la bande 3 css sous la pointe du col
    print("  %s (b) balayage sous la pointe du col :" % name)
    for dy in range(-2, 14):
        yy = ytop + int((yc - 6 + dy) * s)
        row = [(x, p[x, yy]) for x in range(int(60 * s), int(95 * s))]
        cl = [(x, c) for x, c in row if sum(c) / 3.0 > 60 and abs(c[0] - c[2]) < 30]
        if len(cl) > 8:
            xs = [x for x, _ in cl]
            print("      y_local %6.2f : %3d px clairs, x %.1f -> %.1f css, rgb median %s" % (
                (yy - ytop) / s, len(cl), min(xs) / s, max(xs) / s, cl[len(cl) // 2][1]))
