#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

ROOT = Path(__file__).resolve().parent.parent
NAMES = ["capture-1080x2400.png", "capture-1080x1920.png", "capture-1080x1920-bas.png"]
ims = {n: Image.open(ROOT / n).convert("RGB") for n in NAMES}
for n, im in ims.items():
    print(f"IMAGE {n}: {im.width}x{im.height}")
print("CONTROLE_POSITIF largeur commune:", [im.width for im in ims.values()], "->", len({im.width for im in ims.values()}) == 1)
print("CONTROLE_NEGATIF 2400 vs 1920:", ims[NAMES[0]].height, ims[NAMES[1]].height, "->", ims[NAMES[0]].height != ims[NAMES[1]].height)

full, top, bottom = [ims[n] for n in NAMES]


def mad(a, b):
    d = ImageChops.difference(a, b)
    return sum(ImageStat.Stat(d).mean) / 3


# Top capture should share its fixed/top rendering with the full-height capture.
print("MAD 2400 vs 1920 initial, zone 0:1600 =", round(mad(full.crop((0, 0, 1080, 1600)), top.crop((0, 0, 1080, 1600))), 4))

# Match the scrolling document only, excluding left/right margins. Search a vertical shift
# using a downsampled strip; lower is better. Positive shift means source content moved up.
src = top.crop((40, 900, 1040, 1600)).resize((250, 175)).convert("L")
scores = []
for shift in range(350, 551):
    y = 900 - shift
    a = src
    b = bottom.crop((40, y, 1040, y + 700)).resize(src.size).convert("L")
    scores.append((mad(a, b), shift))
best = sorted(scores)[:8]
print("meilleurs_offsets_scroll (MAD, px):", [(round(s, 3), d) for s, d in best])

# Use the visually homologous card/list strip with the best offset and verify actual pixel match.
shift = best[0][1]
src_y0, src_y1 = 900, 1600
dst_y0, dst_y1 = src_y0 - shift, src_y1 - shift
if dst_y0 < 0:
    src_y0 -= dst_y0
    dst_y0 = 0
h = min(src_y1 - src_y0, bottom.height - dst_y0)
region_a = top.crop((40, src_y0, 1040, src_y0 + h))
region_b = bottom.crop((40, dst_y0, 1040, dst_y0 + h))
print(f"verification_offset={shift}: source y={src_y0}:{src_y0+h}, bas y={dst_y0}:{dst_y0+h}, MAD={mad(region_a, region_b):.4f}")


def non_bg_bbox(im, crop, bg, tol=8):
    x0, y0, x1, y1 = crop
    pix = im.load(); xs=[]; ys=[]
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = pix[x, y]
            if max(abs(p[k] - bg[k]) for k in range(3)) > tol:
                xs.append(x); ys.append(y)
    return None if not xs else (min(xs), min(ys), max(xs)+1, max(ys)+1)

# Accessibility: the reply and CTA in bottom state, and clearance to image bottom.
reply_bg = bottom.getpixel((20, 1400))
cta_gold = lambda p: p[0] >= 125 and p[1] >= 85 and p[2] <= 75 and p[0] >= p[2] + 70
pix = bottom.load(); xs=[]; ys=[]
for y in range(1200, bottom.height):
    for x in range(bottom.width):
        if cta_gold(pix[x,y]):
            xs.append(x); ys.append(y)
cta_bbox = None if not xs else (min(xs), min(ys), max(xs)+1, max(ys)+1)
print("bbox pixels or CTA/contour dans état bas:", cta_bbox)
print("marge CTA-encre au bas image:", None if cta_bbox is None else bottom.height - cta_bbox[3], "px")
print("marge CTA-encre au dock fixe (y=1618):", None if cta_bbox is None else 1618 - cta_bbox[3], "px")
print("dock 2400: y=2063..2399, hauteur=337 px, part hauteur=14.04%")
print("dock 1920: y=1618..1919, hauteur=302 px, part hauteur=15.73%")

# Broad horizontal bands at center x reveal clipping/coverage without assuming nominal Rects.
for name, im in [("initial", top), ("bas", bottom)]:
    x = 540; p = im.load(); spans=[]; start=0; prev=p[x,0]
    for y in range(1, im.height):
        cur=p[x,y]
        if max(abs(cur[k]-prev[k]) for k in range(3)) > 5:
            if y-start >= 30: spans.append((start,y-1,prev))
            start=y; prev=cur
    if im.height-start >= 30: spans.append((start,im.height-1,prev))
    print(f"bandes_verticales_x540_{name} >=30px:", spans)
