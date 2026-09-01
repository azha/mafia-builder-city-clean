#!/usr/bin/env python3
"""Un trait horizontal creme d'1 px, EN TROP, a la pointe du col, dans la capture.
Balaye chaque rangee (pas de sous-echantillonnage) sous la pointe du triangle et
signale toute rangee ou une SEULE rangee est claire entre deux rangees sombres.
Contrôle positif : le meme balayage sur la REFERENCE, au meme endroit relatif,
ne doit rien trouver (le SVG ne contient aucun trait horizontal la).
Contrôle negatif : le balayage doit RETROUVER un trait connu — la regle doree
sous le titre (y_local ~57 ref / ~55 cap), qui est bien un trait horizontal."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
GEO = {"REF": (REF, 3.0, 381, 240.0, 275.0, 55.0, 110.0),
       "CAP": (CAP, 3.6, 24, 236.0, 270.0, 50.0, 105.0)}


def scan(p, s, ytop, y0c, y1c, x0c, x1c, seuil=60):
    x0, x1 = int(x0c * s), int(x1c * s)
    out = []
    for y in range(ytop + int(y0c * s), ytop + int(y1c * s)):
        xs = [x for x in range(x0, x1) if sum(p[x, y]) / 3.0 > seuil]
        if len(xs) > int(8 * s):
            out.append((y, min(xs), max(xs), len(xs), p[(min(xs) + max(xs)) // 2, y]))
    return out


for name in ("REF", "CAP"):
    path, s, ytop, y0c, y1c, x0c, x1c = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    r = scan(p, s, ytop, y0c, y1c, x0c, x1c)
    print("  %s : sous la pointe du col (y_local %.0f..%.0f, x %.0f..%.0f css) -> %d rangee(s) claire(s)"
          % (name, y0c, y1c, x0c, x1c, len(r)))
    for y, a, b, n, c in r:
        print("      y_local %6.2f | x %.1f -> %.1f css (largeur %.1f) | %d px | rgb %s" % (
            (y - ytop) / s, a / s, b / s, (b - a + 1) / s, n, c))
    # CTRL- : le trait dore sous le titre, que l'instrument DOIT retrouver
    g = scan(p, s, ytop, 50.0, 62.0, 20.0, 200.0, seuil=90)
    print("  CTRL+ regle doree du titre : %d rangees trouvees, 1re a y_local %.2f, largeur %.1f css" % (
        len(g), (g[0][0] - ytop) / s, (g[0][2] - g[0][1] + 1) / s) if g else "  CTRL+ ECHEC")
