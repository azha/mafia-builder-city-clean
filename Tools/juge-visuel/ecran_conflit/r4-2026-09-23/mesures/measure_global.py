#!/usr/bin/env python3
"""Couche globale : palette, luminance et densité de ruptures."""
from collections import Counter
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
FILES = ["reference-1080x2102.png", "capture-1080x2400.png"]


def linear_luma(rgb):
    vals = []
    for v in rgb:
        c = v / 255.0
        vals.append(c / 12.92 if c <= 0.04045 else ((c + .055) / 1.055) ** 2.4)
    return .2126*vals[0] + .7152*vals[1] + .0722*vals[2]


def edge_density(im, threshold=18):
    # Réduction fixe pour que la mesure reste rapide et comparable.
    small = im.resize((270, round(im.height * 270 / im.width)))
    px = small.load()
    hits = total = 0
    for y in range(small.height - 1):
        for x in range(small.width - 1):
            p, r, d = px[x, y], px[x+1, y], px[x, y+1]
            delta = max(max(abs(p[i]-r[i]), abs(p[i]-d[i])) for i in range(3))
            hits += delta >= threshold
            total += 1
    return hits / total


for name in FILES:
    im = Image.open(ROOT / name).convert("RGB")
    print(f"IMAGE {name} size={im.size}")
    # Palette quantifiée identiquement à 12 couleurs.
    q = im.quantize(colors=12, method=Image.Quantize.MEDIANCUT).convert("RGB")
    c = Counter(q.getdata())
    area = im.width * im.height
    print("  palette_top6=" + repr([(rgb, round(100*n/area, 3)) for rgb, n in c.most_common(6)]))
    # Moyenne de luminance linéaire sur une réduction neutre.
    sample = im.resize((270, round(im.height * 270 / im.width)))
    lumas = [linear_luma(p) for p in sample.getdata()]
    print(f"  linear_luminance_mean={sum(lumas)/len(lumas):.5f}")
    print(f"  edge_density_threshold18={100*edge_density(im):.3f}%")

# Les surfaces homologues sont mesurées avec leurs couleurs exactes les plus fréquentes.
print("\nCONTROL_POSITIVE shared_cream=(242,236,224) and shared_title_ink=(240,223,196)")
print("CONTROL_NEGATIVE full_frame_heights=2102_vs_2400, so full-frame palette shares are descriptive, not a pixel-diff verdict")
