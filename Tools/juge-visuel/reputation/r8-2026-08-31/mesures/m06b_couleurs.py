#!/usr/bin/env python3
"""m06b — echantillons de couleur sur APLATS SEULEMENT. Chaque point est valide par un test de
platitude (ecart max au sein de la fenetre 9x9 <= 8/canal) ; un point non plat est REJETE et
imprime comme tel plutot que publie (les points de m06 etaient contamines par des bords).
Repere m01 : REF (left=18px, top=376px, x3.0) ; CAP (left=18px, top=18px, x3.6).
Controle positif attendu : fond hors cadre, fond du grand panneau, fond des cartes de liste.
Controle negatif attendu : fond de carte de liste 1 (etat actif) != carte 3 (etat normal),
DANS CHAQUE IMAGE separement."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)

# points, en CSS depuis le cadre, donnes SEPAREMENT par image (le contenu est decale de ~2 CSS)
PTS = [
    ("fond hors cadre",            (3, 3),        (3, 3)),
    ("plaque titre - fond",        (150, 15),     (150, 14)),
    ("tuile stat 1 - fond",        (40, 78),      (40, 76)),
    ("tuile stat 3 - fond",        (255, 78),     (255, 76)),
    ("grand panneau - fond bas",   (150, 320),    (150, 322)),
    ("carte portrait - fond haut", (100, 150),    (100, 148)),
    ("carte liste 1 - fond",       (230, 150),    (230, 148)),
    ("carte liste 3 - fond",       (230, 210),    (230, 208)),
    ("panneau verdict - fond",     (150, 400),    (150, 401)),
    ("CTA - fond",                 (100, 430),    (100, 431)),
]


def med(px, cx, cy, n=4):
    v = [px[cx + dx, cy + dy] for dx in range(-n, n + 1) for dy in range(-n, n + 1)]
    m = tuple(sorted(c[i] for c in v)[len(v) // 2] for i in range(3))
    spread = max(max(c[i] for c in v) - min(c[i] for c in v) for i in range(3))
    return m, spread


ims = {}
for n, (p, sc, left, top) in (("REF", REF), ("CAP", CAP)):
    im = Image.open(p).convert("RGB")
    print(f"{n} {p.split('/')[-1]} {im.size}")
    ims[n] = (im.load(), sc, left, top)

print(f"{'point':30s} {'REF':>15s} {'sp':>3s} {'CAP':>15s} {'sp':>3s}  dmax")
for lbl, pr, pc in PTS:
    res = []
    for n, pt in (("REF", pr), ("CAP", pc)):
        px, sc, left, top = ims[n]
        res.append(med(px, int(left + pt[0] * sc), int(top + pt[1] * sc)))
    (a, sa), (b, sb) = res
    d = max(abs(u - v) for u, v in zip(a, b))
    bad = " REJETE(non plat)" if sa > 8 or sb > 8 else ("" if d <= 6 else "  <<< ECART")
    print(f"{lbl:30s} {str(a):>15s} {sa:3d} {str(b):>15s} {sb:3d}  {d:3d}{bad}")
