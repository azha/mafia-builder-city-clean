#!/usr/bin/env python3
"""m06 — echantillons de couleur (mediane 9x9) sur des aplats, en coordonnees CSS depuis le haut
du cadre (repere m01). Sert de CONTROLE POSITIF global du rapport.
Controle negatif integre: deux points dont on SAIT qu'ils different (fond de carte vs fond de
panneau) doivent sortir des valeurs differentes."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)

# (label, x_css, y_css) - repere haut du cadre. Decalage global CAP ~ -2 CSS, negligeable sur aplat.
PTS = [
    ("fond hors cadre (haut-gauche)", 3, 3),
    ("fond DANS le cadre", 150, 105),
    ("plaque titre (fond)", 150, 20),
    ("titre 'Le miroir' (or)", 118, 30),
    ("regle doree sous le titre", 150, 59.5),
    ("tuile stat 1 (fond)", 40, 75),
    ("chiffre 00 turquoise", 57, 85),
    ("grand panneau (fond)", 150, 315),
    ("carte portrait (fond)", 100, 130),
    ("carte liste 1 (fond)", 200, 145),
    ("carte liste 3 (fond)", 200, 210),
    ("panneau verdict (fond)", 150, 400),
    ("CTA (fond)", 150, 430),
    ("CTA (bordure haut)", 150, 417.6),
]


def med(px, cx, cy, n=4):
    v = [px[cx + dx, cy + dy] for dx in range(-n, n + 1) for dy in range(-n, n + 1)]
    return tuple(sorted(c[i] for c in v)[len(v) // 2] for i in range(3))


ims = {}
for n, (p, sc, left, top) in (("REF", REF), ("CAP", CAP)):
    im = Image.open(p).convert("RGB")
    print(f"{n} {p.split('/')[-1]} {im.size}")
    ims[n] = (im.load(), sc, left, top)

print(f"{'point':34s} {'REF':>16s} {'CAP':>16s}  delta max/canal")
for lbl, x, y in PTS:
    out = []
    for n in ("REF", "CAP"):
        px, sc, left, top = ims[n]
        out.append(med(px, int(left + x * sc), int(top + y * sc)))
    d = max(abs(a - b) for a, b in zip(*out))
    flag = "" if d <= 6 else ("  <<< ECART" if d > 12 else "  < limite")
    print(f"{lbl:34s} {str(out[0]):>16s} {str(out[1]):>16s}  {d:3d}{flag}")
