#!/usr/bin/env python3
"""Hauteur de CAPITALE, ligne par ligne : dans une fenetre large, on decoupe
l'encre en bandes horizontales (les lignes de texte) et on donne la hauteur de
chaque bande. La 1re ligne d'un texte tout-capitales donne la hauteur de capitale.
Contrôle positif : le libelle 'REGLES DONNEES' (tout capitales, meme chaine)
doit donner la meme hauteur des deux cotes a 5 % pres.
Contrôle negatif : une fenetre de fond -> 0 bande."""
from PIL import Image

REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r7-2026-08-31/reference/m-120.png"
CAP = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
S = {"REF": (REF, 3.0, 381), "CAP": (CAP, 3.6, 24)}
Z = [  # (libelle, x0,x1, y0_ref,y1_ref, y0_cap,y1_cap) css / css_local
    ("titre 'Le miroir'",          30, 260,   5,  30,   3,  28),
    ("sur-titre (2 lignes)",       30, 260,  30,  50,  28,  48),
    ("libelle REGLES DONNEES",     20,  95,  96, 108,  94, 106),
    ("verdict (2 lignes)",        145, 215, 116, 145, 113, 142),
    ("legende 'ce qu'il a...'",   216, 285, 116, 145, 113, 142),
    ("carte1 titre 'col ouvert'", 168, 262, 152, 165, 143, 156),
    ("carte1 sous-titre",         168, 262, 163, 176, 154, 168),
    ("'Il vous ecoute'",           28, 138, 272, 294, 258, 280),
    ("mention lieutenant.name",    28, 138, 292, 305, 276, 290),
    ("sur-titre bas 'PAS JUG.'",   22, 250, 332, 344, 336, 348),
    ("titre 2 'Rien n'a...'",      22, 260, 344, 366, 348, 370),
    ("CTA",                        40, 260, 420, 440, 420, 440),
    ("CTRL- fond",                 30, 100, 305, 316, 300, 312),
]


def med(v):
    v = sorted(v); return v[len(v) // 2]


for name in ("REF", "CAP"):
    path, s, ytop = S[name]
    im = Image.open(path).convert("RGB")
    print("OUVERT", path.split("/")[-1], im.size)
    p = im.load()
    for lab, x0c, x1c, ry0, ry1, cy0, cy1 in Z:
        y0c, y1c = (ry0, ry1) if name == "REF" else (cy0, cy1)
        x0, x1 = int(x0c * s), int(x1c * s)
        y0, y1 = ytop + int(y0c * s), ytop + int(y1c * s)
        fond = med([sum(p[x, y]) / 3.0 for y in range(y0, y1) for x in range(x0, x1)])
        seuil = fond + 25
        rows, cur, out = [], None, []
        for y in range(y0, y1):
            n = sum(1 for x in range(x0, x1) if sum(p[x, y]) / 3.0 > seuil)
            on = n >= 2
            if on and cur is None:
                cur = y
            elif not on and cur is not None:
                out.append(((cur - ytop) / s, (y - 1 - ytop) / s, (y - cur) / s)); cur = None
        if cur is not None:
            out.append(((cur - ytop) / s, (y1 - 1 - ytop) / s, (y1 - cur) / s))
        out = [o for o in out if o[2] > 1.0]
        print("  %s %-27s : %d ligne(s) -> %s" % (
            name, lab, len(out), " | ".join("y %.1f..%.1f h=%.2f css" % o for o in out)))
