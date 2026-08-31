#!/usr/bin/env python3
"""Le gant (trait 'gants sales'). SVG : ellipse rx=5 ry=3.4 (rapport L/H = 1.47),
fill #232a2d, stroke #0b1016 1.2, PLUS deux traits DIAGONAUX ('M9 74 l3 1.6
M13 74.6 l3 -1').
Mesure : bbox de l'ellipse (composante claire dans le coin bas-gauche du buste),
rapport L/H, et l'orientation des deux marques (pente moyenne).
Contrôle positif : le rapport L/H attendu par le SVG = 1.47 ; la reference doit
s'en approcher. Contrôle negatif : la meme detection au CENTRE du buste (ou il
n'y a pas de gant) doit trouver 0 pixel."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
#              path,   s, ytop, fenetre css (x0,x1,y0,y1)   , fenetre CTRL- (centre du buste)
GEO = {"REF": (REF, 3.0, 381, (42, 68, 246, 268), (75, 95, 250, 262)),
       "CAP": (CAP, 3.6, 24, (35, 61, 241, 263), (68, 88, 245, 257))}


def clair(c):  # le gant est plus clair que le buste (#16191b) et que le liseré
    return sum(c) / 3.0 > 32


for name in ("REF", "CAP"):
    path, s, ytop, F, N = GEO[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    x0, x1, y0, y1 = [int(F[0] * s), int(F[1] * s), ytop + int(F[2] * s), ytop + int(F[3] * s)]
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if clair(p[x, y])]
    xs = [a for a, _ in pts]; ys = [b for _, b in pts]
    L = (max(xs) - min(xs) + 1) / s
    H = (max(ys) - min(ys) + 1) / s
    print("  %s GANT : n=%d | x %.1f->%.1f css | y_local %.1f->%.1f css | L=%.2f H=%.2f css | "
          "rapport L/H = %.2f (SVG attend 1.47)" % (
              name, len(pts), min(xs) / s, max(xs) / s, (min(ys) - ytop) / s, (max(ys) - ytop) / s, L, H, L / H))
    # couleur au centre
    cx, cy = (min(xs) + max(xs)) // 2, (min(ys) + max(ys)) // 2
    print("     couleur au centre : %s   (jeton 'rang' #232a2d = (35,42,45))" % (p[cx, cy],))
    # marques : pixels SOMBRES a l'interieur de l'ellipse
    dark = [(x, y) for x, y in pts if sum(p[x, y]) / 3.0 < 26]
    dark = [(x, y) for y in range(min(ys), max(ys) + 1) for x in range(min(xs), max(xs) + 1)
            if sum(p[x, y]) / 3.0 < 26 and min(xs) + int(1.5 * s) < x < max(xs) - int(1.5 * s)
            and min(ys) + int(1.5 * s) < y < max(ys) - int(1.5 * s)]
    if dark:
        dxs = [a for a, _ in dark]; dys = [b for _, b in dark]
        # pente : pour chaque moitie (gauche/droite), y moyen aux bords
        xm = (min(dxs) + max(dxs)) / 2.0
        for lab, sel in (("marque gauche", [t for t in dark if t[0] < xm]),
                         ("marque droite", [t for t in dark if t[0] >= xm])):
            if len(sel) < 6:
                print("     %s : trop peu de pixels" % lab); continue
            sel.sort()
            g = sel[:max(3, len(sel) // 6)]; d = sel[-max(3, len(sel) // 6):]
            ymg = sum(t[1] for t in g) / float(len(g)); ymd = sum(t[1] for t in d) / float(len(d))
            xmg = sum(t[0] for t in g) / float(len(g)); xmd = sum(t[0] for t in d) / float(len(d))
            pente = (ymd - ymg) / (xmd - xmg) if xmd != xmg else 0.0
            print("     %s : n=%d, longueur %.1f css, PENTE dy/dx = %+.2f "
                  "(SVG : gauche +0.53, droite -0.33 ; 0.00 = trait horizontal)" % (
                      lab, len(sel), (max(t[0] for t in sel) - min(t[0] for t in sel) + 1) / s, pente))
    # CTRL-
    nx0, nx1, ny0, ny1 = int(N[0] * s), int(N[1] * s), ytop + int(N[2] * s), ytop + int(N[3] * s)
    n = sum(1 for y in range(ny0, ny1) for x in range(nx0, nx1) if clair(p[x, y]))
    print("  CTRL- centre du buste (pas de gant) : %d px clairs" % n)
