#!/usr/bin/env python3
from collections import Counter
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
NAMES = [
    "reference-1080x2102.png",
    "capture-1080x2400.png",
    "capture-1080x1920.png",
    "capture-1080x1920-bas.png",
]


def rgb(im):
    return im.convert("RGB")


def quant_palette(im, colors=12):
    small = im.resize((270, max(1, round(im.height * 270 / im.width))))
    q = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    counts = Counter(q.getdata())
    total = q.width * q.height
    return [(c, round(n * 100 / total, 2)) for c, n in counts.most_common()]


def mean_luma(im):
    st = ImageStat.Stat(im.convert("L"))
    return round(st.mean[0], 2)


def ink_density(im):
    # Quantifies local visual activity rather than assuming a single background token.
    g = im.convert("L").resize((270, max(1, round(im.height * 270 / im.width))))
    px = g.load()
    active = total = 0
    for y in range(1, g.height):
        for x in range(1, g.width):
            total += 1
            if abs(px[x, y] - px[x - 1, y]) >= 10 or abs(px[x, y] - px[x, y - 1]) >= 10:
                active += 1
    return round(active * 100 / total, 2)


def row_change_peaks(im, count=18):
    # Mean absolute RGB change between adjacent rows; broad section boundaries dominate.
    w, h = im.size
    sample_x = range(0, w, 4)
    prev = None
    vals = []
    pix = im.load()
    for y in range(h):
        row = tuple(sum(pix[x, y][k] for x in sample_x) / len(sample_x) for k in range(3))
        if prev is not None:
            vals.append((sum(abs(row[k] - prev[k]) for k in range(3)), y))
        prev = row
    # Non-maximum suppression over 8 px so a single border is not repeated.
    out = []
    for score, y in sorted(vals, reverse=True):
        if all(abs(y - yy) > 8 for _, yy in out):
            out.append((round(score, 1), y))
            if len(out) == count:
                break
    return sorted(out, key=lambda z: z[1])


images = {n: rgb(Image.open(ROOT / n)) for n in NAMES}
for n, im in images.items():
    print(f"IMAGE {n}: {im.size[0]}x{im.size[1]}")

widths = [im.width for im in images.values()]
heights = [im.height for im in images.values()]
print(f"CONTROLE_POSITIF largeur commune: {widths} -> {len(set(widths)) == 1}")
print(f"CONTROLE_NEGATIF hauteurs distinctes: {heights} -> {len(set(heights)) > 1}")

for n, im in images.items():
    print(f"\n[{n}]")
    print("palette_quantifiee RGB,% =", quant_palette(im))
    print("luminance_moyenne =", mean_luma(im))
    print("densite_bords_locale_pct =", ink_density(im))
    print("frontieres_verticales score,y =", row_change_peaks(im))

ref = images[NAMES[0]]
cap_overlap = images[NAMES[1]].crop((0, 0, 1080, ref.height))
print("\n[COMPARAISON SUR HAUTEUR COMMUNE 1080x2102]")
print("IMAGE reference comparee:", ref.size)
print("IMAGE capture croppee comparee:", cap_overlap.size)
print("CONTROLE_POSITIF dimensions de comparaison:", ref.size, cap_overlap.size, "->", ref.size == cap_overlap.size)
print("reference luminance,densite:", mean_luma(ref), ink_density(ref))
print("capture luminance,densite:", mean_luma(cap_overlap), ink_density(cap_overlap))
print("delta capture-reference:", round(mean_luma(cap_overlap)-mean_luma(ref),2), round(ink_density(cap_overlap)-ink_density(ref),2))
