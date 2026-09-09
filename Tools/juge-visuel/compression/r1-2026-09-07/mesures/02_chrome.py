#!/usr/bin/env python3
# 02 — geometrie du CHROME de la capture (bandeau, filet, dock) + comparaison au canon HUD.
# Controle positif : la largeur pleine (1080 / 1176) doit ressortir sur la ligne du filet.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def med_ligne(px, W, y, pas=2):
    v = sorted(px[x, y] for x in range(0, W, pas))
    return v[len(v)//2]

def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

for f, css_ref in [('capture-1080x2400.png', 392.0), ('hud-canon-1176.png', 392.0)]:
    im = Image.open(os.path.join(D, f)).convert('RGB'); W,H = im.size
    print(f"=== {f}  {W}x{H}   (1 CSS-HUD = {W/css_ref:.4f} px) ===")
    px = im.load()
    # cherche la ligne la plus ROUGE-dominante sur toute la largeur (filet du bandeau)
    best = []
    for y in range(0, 400):
        m = med_ligne(px, W, y)
        best.append((m[0]-m[2], y, m))
    best.sort(reverse=True)
    print("  lignes les plus rouges (r-b, y, RGB median) :", [(round(b[0]),b[1],b[2]) for b in best[:4]])
    # profil de luminance mediane par ligne, haut et bas
    print("  -- haut (y, RGBmed, lum) --")
    for y in [0,20,60,100,110,115,118,120,125,130,140,150,160,200]:
        m = med_ligne(px,W,y); print(f"     y={y:4d} {m} lum={lum(m):5.1f}")
    print("  -- bas (y, RGBmed, lum) --")
    for y in range(H-350, H, 25):
        m = med_ligne(px,W,y); print(f"     y={y:4d} {m} lum={lum(m):5.1f}")
