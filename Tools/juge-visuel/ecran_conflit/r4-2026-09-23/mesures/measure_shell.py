#!/usr/bin/env python3
"""Mesures du chrome supérieur et du cadre extérieur."""
from collections import Counter
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
REF_NAME = "reference-1080x2102.png"
CAP_NAME = "capture-1080x2400.png"
ref = Image.open(ROOT / REF_NAME).convert("RGB")
cap = Image.open(ROOT / CAP_NAME).convert("RGB")
print(f"IMAGE {REF_NAME} size={ref.size}")
print(f"IMAGE {CAP_NAME} size={cap.size}")


def bbox_mask(im, roi, pred):
    x0, y0, x1, y1 = roi
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if pred(im.getpixel((x, y)))]
    if not pts:
        return None
    return (min(x for x, _ in pts), min(y for _, y in pts), max(x for x, _ in pts), max(y for _, y in pts), len(pts))


def median(im, box):
    return tuple(int(v) for v in ImageStat.Stat(im.crop(box)).median)


bar = (41, 27, 22)
for side, im in (("ref", ref), ("cap", cap)):
    c = Counter(im.crop((0, 130, 1080, 245)).getdata())
    n = c[bar]
    b = bbox_mask(im, (0, 130, 1080, 245), lambda p: p == bar)
    print(f"BROWN_HEADER_BAND {side}: exact={bar} count={n} bbox_count={b} share_of_115px_strip={100*n/(1080*115):.2f}%")
    print(f"  side_median_left={median(im, (40,160,350,215))} right={median(im, (730,160,1040,215))}")

# Or de l'anneau du médaillon. Le masque est limité à une couronne autour du
# centre observé afin d'exclure le long filet horizontal et le losange du shell.
gold = lambda p: 150 <= p[0] <= 205 and 110 <= p[1] <= 165 and 35 <= p[2] <= 95
def ring_points_bbox(im, center):
    cx, cy = center
    pts = []
    for y in range(0, 230):
        for x in range(420, 660):
            radius = ((x-cx)**2 + (y-cy)**2) ** 0.5
            if 75 <= radius <= 105 and gold(im.getpixel((x, y))):
                pts.append((x, y))
    return (min(x for x, _ in pts), min(y for _, y in pts),
            max(x for x, _ in pts), max(y for _, y in pts), len(pts))

rb = ring_points_bbox(ref, (539, 120))
cb = ring_points_bbox(cap, (540, 105))
print(f"\nMEDALLION_GOLD_BBOX ref={rb} cap={cb}")
if rb and cb:
    rc = ((rb[0]+rb[2])/2, (rb[1]+rb[3])/2)
    cc = ((cb[0]+cb[2])/2, (cb[1]+cb[3])/2)
    print(f"MEDALLION_GOLD_CENTER ref={rc} cap={cc} delta=({cc[0]-rc[0]:.1f},{cc[1]-rc[1]:.1f})")
    print(f"MEDALLION_GOLD_EXTENT ref=({rb[2]-rb[0]+1},{rb[3]-rb[1]+1}) cap=({cb[2]-cb[0]+1},{cb[3]-cb[1]+1})")


def longest_run(im, x, rgb):
    best = (0, None, None)
    s = None
    for y in range(im.height + 1):
        match = y < im.height and im.getpixel((x, y)) == rgb
        if match and s is None:
            s = y
        if not match and s is not None:
            if y-s > best[0]:
                best = (y-s, s, y-1)
            s = None
    return best


frame = (58, 67, 86)
print("\nOUTER_FRAME:")
for x in (0, 1, 1078, 1079):
    print(f"  x={x} ref_longest={longest_run(ref,x,frame)} cap_longest={longest_run(cap,x,frame)}")

# Contrôle positif : dimensions de l'anneau quasiment conservées.
if rb and cb:
    rwh = (rb[2]-rb[0]+1, rb[3]-rb[1]+1)
    cwh = (cb[2]-cb[0]+1, cb[3]-cb[1]+1)
    print(f"\nCONTROL_POSITIVE medallion_extent ref={rwh} cap={cwh} delta=({cwh[0]-rwh[0]},{cwh[1]-rwh[1]})")

# Contrôle négatif : la bande brune doit être détectée seulement dans le jeu.
nr = Counter(ref.crop((0,130,1080,245)).getdata())[bar]
nc = Counter(cap.crop((0,130,1080,245)).getdata())[bar]
print(f"CONTROL_NEGATIVE brown_band ref_count={nr} cap_count={nc} ratio={(nc/max(1,nr)):.1f}x distinct={nc > nr*10}")
