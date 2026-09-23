#!/usr/bin/env python3
"""Mesure des aplats, boîtes et encres homologues à largeur native égale.

Les composantes sont calculées sur les couleurs exactes dominantes, loin des
franges d'anticrénelage. Les boîtes d'encre sont calculées dans des ROI nommées.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parents[1]
REF_NAME = "reference-1080x2102.png"
CAP_NAME = "capture-1080x2400.png"
ref = Image.open(ROOT / REF_NAME).convert("RGB")
cap = Image.open(ROOT / CAP_NAME).convert("RGB")
print(f"IMAGE {REF_NAME} size={ref.size}")
print(f"IMAGE {CAP_NAME} size={cap.size}")


def comps_exact(im, rgb, min_area=40):
    w, h = im.size
    px = im.load()
    seen = set()
    out = []
    for y in range(h):
        for x in range(w):
            if (x, y) in seen or px[x, y] != rgb:
                continue
            stack = [(x, y)]
            seen.add((x, y))
            x0 = x1 = x
            y0 = y1 = y
            n = 0
            while stack:
                xx, yy = stack.pop()
                n += 1
                x0, x1 = min(x0, xx), max(x1, xx)
                y0, y1 = min(y0, yy), max(y1, yy)
                for nx, ny in ((xx-1, yy), (xx+1, yy), (xx, yy-1), (xx, yy+1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny] == rgb:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            if n >= min_area:
                out.append((n, (x0, y0, x1, y1)))
    return sorted(out, reverse=True)


COLORS = {
    "cream_panel": ((242, 236, 224), (242, 236, 224)),
    "selected_card": ((46, 33, 20), (46, 34, 22)),
    "normal_card": ((36, 28, 20), (34, 28, 22)),
    "cta": ((36, 28, 17), (34, 28, 13)),
    "reply_band": ((20, 26, 33), (22, 28, 34)),
    "title_band": ((32, 24, 15), (34, 22, 13)),
}

print("\nAPLAT_COMPONENTS (area, bbox inclusive, width, height):")
for label, (rrgb, crgb) in COLORS.items():
    for side, im, rgb in (("ref", ref, rrgb), ("cap", cap, crgb)):
        cs = comps_exact(im, rgb, min_area=500)[:8]
        shaped = [(n, b, b[2]-b[0]+1, b[3]-b[1]+1) for n, b in cs]
        print(f"  {label} {side} rgb={rgb}: {shaped}")


def median_box(im, box):
    return tuple(int(v) for v in ImageStat.Stat(im.crop(box)).median)


SAMPLES = {
    "title_band": ((500, 500, 580, 540), (500, 500, 580, 540)),
    "cream_panel": ((500, 700, 580, 730), (500, 700, 580, 730)),
    "selected_card": ((500, 1120, 580, 1150), (500, 1080, 580, 1110)),
    "normal_card": ((500, 1300, 580, 1330), (500, 1260, 580, 1290)),
    "reply_band": ((500, 1800, 580, 1830), (500, 1760, 580, 1790)),
    "cta": ((500, 1980, 580, 2010), (500, 1900, 580, 1930)),
}
print("\nMEDIAN_SAMPLES:")
for label, (rb, cb) in SAMPLES.items():
    a, b = median_box(ref, rb), median_box(cap, cb)
    print(f"  {label}: ref={a} cap={b} delta={tuple(b[i]-a[i] for i in range(3))}")


def ink_bbox(im, roi, bg, tolerance=12):
    x0, y0, x1, y1 = roi
    pts = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = im.getpixel((x, y))
            if max(abs(p[i] - bg[i]) for i in range(3)) > tolerance:
                pts.append((x, y))
    if not pts:
        return None
    return (min(x for x, _ in pts), min(y for _, y in pts), max(x for x, _ in pts), max(y for _, y in pts))


# ROI serrées évitant les bords/traits ; chaque ligne donne la boîte de l'encre visible.
INK = {
    "screen_title": ((45, 450, 550, 510), (45, 405, 550, 465), (32, 24, 15), (34, 22, 13)),
    "screen_subtitle": ((45, 525, 980, 590), (45, 460, 980, 520), (32, 24, 15), (34, 22, 13)),
    "order_sentence": ((225, 700, 970, 800), (200, 730, 1000, 825), (242, 236, 224), (242, 236, 224)),
    "families_heading": ((45, 1000, 800, 1050), (45, 1005, 800, 1055), (32, 24, 15), (35, 22, 22)),
    "first_family_name": ((200, 1090, 500, 1150), (170, 1090, 500, 1150), (46, 33, 20), (46, 34, 22)),
    "reply": ((45, 1790, 1030, 1880), (70, 1780, 1010, 1865), (20, 26, 33), (22, 28, 34)),
    "cta_label": ((80, 1930, 600, 2005), (90, 1870, 590, 1950), (36, 28, 17), (34, 28, 13)),
}
print("\nINK_BBOXES (inclusive):")
for label, (rr, cr, rbg, cbg) in INK.items():
    rb = ink_bbox(ref, rr, rbg)
    cb = ink_bbox(cap, cr, cbg)
    def wh(b): return None if b is None else (b[2]-b[0]+1, b[3]-b[1]+1)
    print(f"  {label}: ref={rb} wh={wh(rb)} cap={cb} wh={wh(cb)}")


print("\nNORMALIZED_LANDMARKS (% width, same 1080px basis):")
landmarks = {
    "cream_left": (49, 46),
    "cream_right": (1002, 1034),
    "reference_selected_card_top_vs_capture": (1053, 1063),
    "reference_reply_top_vs_capture": (1787, 1744),
}
for label, (a, b) in landmarks.items():
    print(f"  {label}: ref={a}px={100*a/1080:.2f}% cap={b}px={100*b/1080:.2f}% delta={b-a}px={100*(b-a)/1080:.2f}pp")

# Témoin positif : même couleur de panneau crème au centre, même largeur native.
rcream = median_box(ref, (520, 690, 560, 720))
ccream = median_box(cap, (520, 690, 560, 720))
print(f"\nCONTROL_POSITIVE cream_center ref={rcream} cap={ccream} equal={rcream == ccream}")
print(f"CONTROL_POSITIVE native_width ref={ref.width} cap={cap.width} equal={ref.width == cap.width == 1080}")

# Témoin négatif : les cartes normales n'ont pas le même aplat exact que le panneau crème.
normal = median_box(cap, (520, 1260, 560, 1290))
print(f"CONTROL_NEGATIVE cream_vs_normal cream={ccream} normal={normal} distinct={ccream != normal}")
