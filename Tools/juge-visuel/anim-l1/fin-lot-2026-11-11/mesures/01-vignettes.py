#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""01 — vignettes 1/4 (270x600) pour lecture a l'oeil + profil de luminance par bande de 100 px.
Controle positif : chaque vignette est produite depuis une image 1080x2400 (taille imprimee).
"""
import os
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
D = os.path.normpath(os.path.join(ICI, "..", "captures"))
OUT = os.path.join(ICI, "vignettes")
os.makedirs(OUT, exist_ok=True)

noms = sorted(f for f in os.listdir(D) if f.endswith(".png"))
for n in noms:
    im = Image.open(os.path.join(D, n)).convert("RGB")
    print(f"{n:44s} lue en {im.size}", end="  ")
    v = im.resize((270, 600), Image.LANCZOS)
    v.save(os.path.join(OUT, n.replace("_1080x2400", "")))
    # profil : luminance moyenne par bande horizontale de 100 px
    prof = []
    for y0 in range(0, 2400, 100):
        band = im.crop((0, y0, 1080, y0 + 100))
        px = band.getdata()
        s = 0
        for r, g, b in px:
            s += (r * 299 + g * 587 + b * 114) // 1000
        prof.append(s / (1080 * 100))
    print("profil L/100px:", " ".join(f"{v:.0f}" for v in prof))
print("vignettes dans", OUT)
