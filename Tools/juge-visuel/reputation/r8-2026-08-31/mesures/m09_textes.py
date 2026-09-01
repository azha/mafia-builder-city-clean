#!/usr/bin/env python3
"""m09 — hauteurs de capitale et bbox d'encre des textes principaux, en px CSS (repere m01).
Methode: dans une fenetre CSS donnee, masque 'encre' = pixels dont la luminance depasse le fond
de +30 ; bbox de l'encre. La hauteur mesuree est celle de l'ENCRE de la fenetre (choisie pour ne
contenir que des majuscules ou une ligne de texte).
Controle positif: la hauteur de capitale de 'DONNER UNE PREMIERE REGLE' (CTA) — meme token.
Controle negatif: une fenetre VIDE (fond du panneau) doit rendre 'ABSENT'."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)

# label -> fenetre CSS (x0,y0,x1,y1) par image : (ref, cap)
W = [
    ("titre 'Le miroir'",        (100, 12, 200, 36),   (100, 12, 200, 36)),
    ("sur-titre plaque L1",      (40, 38, 260, 48),    (40, 37, 260, 47)),
    ("chiffre 00 tuile1",        (40, 68, 90, 92),     (40, 66, 90, 90)),
    ("libelle REGLES DONNEES",   (24, 93, 96, 101),    (24, 91, 96, 99)),
    ("'Pas encore' (l.1)",       (150, 112, 215, 130), (148, 110, 215, 128)),
    ("'col ouvert'",             (172, 156, 260, 170), (168, 146, 260, 160)),
    ("'la comptabilite tenue'",  (172, 170, 270, 180), (168, 160, 270, 170)),
    ("'Il vous ecoute'",         (30, 273, 120, 292),  (28, 270, 120, 289)),
    ("'Rien n a encore'",        (24, 348, 200, 372),  (24, 350, 200, 374)),
    ("CTA 'DONNER UNE'",         (60, 425, 160, 438),  (60, 426, 160, 439)),
    ("[ctrl neg] fenetre vide",  (150, 306, 200, 316), (150, 306, 200, 316)),
]


def ink(path, sc, left, top, win):
    im = Image.open(path).convert("RGB")
    px = im.load()
    x0 = int(left + win[0] * sc); y0 = int(top + win[1] * sc)
    x1 = int(left + win[2] * sc); y1 = int(top + win[3] * sc)
    vals = [sum(px[x, y][:3]) / 3 for y in range(y0, y1) for x in range(x0, x1)]
    vals_s = sorted(vals)
    bg = vals_s[len(vals_s) // 10]
    thr = bg + 30
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if sum(px[x, y][:3]) / 3 > thr]
    if len(pts) < 20:
        return im.size, None
    X = [p[0] for p in pts]; Y = [p[1] for p in pts]
    return im.size, (round((min(X) - left) / sc, 1), round((min(Y) - top) / sc, 1),
                     round((max(X) - left) / sc, 1), round((max(Y) - top) / sc, 1))


sizes = {}
print(f"{'texte':28s} {'REF h':>7s} {'CAP h':>7s} {'delta%':>7s}   bbox REF / bbox CAP")
for lbl, wr, wc in W:
    out = []
    for n, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
        win = wr if n == "REF" else wc
        s, bb = ink(p, sc, l, t, win)
        sizes[n] = s
        out.append(bb)
    a, b = out
    if a is None or b is None:
        print(f"{lbl:28s} {'ABSENT' if a is None else 'ok':>7s} {'ABSENT' if b is None else 'ok':>7s}")
        continue
    ha = a[3] - a[1]; hb = b[3] - b[1]
    print(f"{lbl:28s} {ha:7.1f} {hb:7.1f} {100*(hb-ha)/ha:7.1f}   {a} / {b}")
print("images:", sizes)
