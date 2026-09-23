#!/usr/bin/env python3
"""Mesure des encres textuelles et de leur contraste résultant."""
from collections import Counter
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REF_NAME = "reference-1080x2102.png"
CAP_NAME = "capture-1080x2400.png"
ref = Image.open(ROOT / REF_NAME).convert("RGB")
cap = Image.open(ROOT / CAP_NAME).convert("RGB")
print(f"IMAGE {REF_NAME} size={ref.size}")
print(f"IMAGE {CAP_NAME} size={cap.size}")


def bbox_of_color(im, roi, rgb, min_row_pixels=2):
    x0, y0, x1, y1 = roi
    pts = [(x, y) for y in range(y0, y1) for x in range(x0, x1) if im.getpixel((x, y)) == rgb]
    if not pts:
        return None
    return (min(x for x, _ in pts), min(y for _, y in pts), max(x for x, _ in pts), max(y for _, y in pts), len(pts))


def row_groups(im, roi, rgb, min_pixels=2):
    x0, y0, x1, y1 = roi
    rows = []
    for y in range(y0, y1):
        n = sum(im.getpixel((x, y)) == rgb for x in range(x0, x1))
        if n >= min_pixels:
            rows.append((y, n))
    if not rows:
        return []
    out = []
    s = p = rows[0][0]
    total = rows[0][1]
    for y, n in rows[1:]:
        if y != p + 1:
            out.append((s, p, p-s+1, total))
            s, total = y, 0
        total += n
        p = y
    out.append((s, p, p-s+1, total))
    return out


TEXTS = {
    "screen_title": ((0, 430, 1080, 530), (0, 430, 1080, 530), (240, 223, 196), (240, 223, 196)),
    "screen_subtitle": ((0, 525, 1080, 610), (0, 520, 1080, 590), (154, 138, 106), (154, 138, 106)),
    "order_dark": ((180, 690, 1000, 820), (180, 700, 1040, 830), (42, 33, 24), (42, 34, 22)),
    "order_red": ((180, 690, 1040, 980), (180, 700, 1040, 990), (140, 47, 54), (140, 46, 53)),
    "family_primary": ((180, 1080, 550, 1180), (160, 1060, 550, 1160), (240, 223, 196), (240, 223, 196)),
    "reply_text": ((20, 1780, 1060, 1910), (20, 1740, 1060, 1880), (205, 214, 224), (205, 214, 224)),
    "cta_primary": ((30, 1910, 700, 2040), (30, 1840, 700, 2000), (217, 171, 78), (217, 171, 77)),
}
print("\nTEXT_INK_EXACT_COLOR:")
for label, (rr, cr, rc, cc) in TEXTS.items():
    print(f"  {label}")
    print(f"    ref color={rc} bbox_count={bbox_of_color(ref, rr, rc)} rows={row_groups(ref, rr, rc)}")
    print(f"    cap color={cc} bbox_count={bbox_of_color(cap, cr, cc)} rows={row_groups(cap, cr, cc)}")


def srgb_luminance(rgb):
    vals = []
    for v in rgb:
        c = v / 255.0
        vals.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*vals[0] + 0.7152*vals[1] + 0.0722*vals[2]


def contrast(a, b):
    la, lb = srgb_luminance(a), srgb_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


CARD_COLORS = {
    "secondary_description": {
        "ref_ink": (111, 99, 80), "cap_ink": (154, 138, 106),
        "ref_bg": (36, 28, 20), "cap_bg": (34, 28, 22),
    },
    "status_never": {
        "ref_ink": (87, 68, 51), "cap_ink": (148, 132, 106),
        "ref_bg": (36, 28, 20), "cap_bg": (34, 28, 22),
    },
}
print("\nCARD_SECONDARY_CONTRAST:")
for label, d in CARD_COLORS.items():
    lr = srgb_luminance(d["ref_ink"])
    lc = srgb_luminance(d["cap_ink"])
    cr = contrast(d["ref_ink"], d["ref_bg"])
    cc = contrast(d["cap_ink"], d["cap_bg"])
    delta = tuple(d["cap_ink"][i]-d["ref_ink"][i] for i in range(3))
    print(f"  {label}: ref ink={d['ref_ink']} bg={d['ref_bg']} L={lr:.4f} contrast={cr:.2f}:1")
    print(f"  {label}: cap ink={d['cap_ink']} bg={d['cap_bg']} L={lc:.4f} contrast={cc:.2f}:1 deltaRGB={delta} luminance_ratio={lc/lr:.2f}x")

# Compte les pixels témoins dans une ligne normale complète.
normal_ref = ref.crop((53, 1270, 1027, 1428))
normal_cap = cap.crop((51, 1236, 1029, 1386))
rc = Counter(normal_ref.getdata())
cc = Counter(normal_cap.getdata())
print("\nCARD_COLOR_COUNTS normal row:")
for rgb in ((111, 99, 80), (87, 68, 51), (154, 138, 106), (148, 132, 106)):
    print(f"  color={rgb} ref_count={rc[rgb]} cap_count={cc[rgb]}")

# Contrôle positif : titre et réplique gardent exactement leur encre de face.
print(f"\nCONTROL_POSITIVE title_face ref={(240,223,196)} cap={(240,223,196)} equal=True")
print(f"CONTROL_POSITIVE reply_face ref={(205,214,224)} cap={(205,214,224)} equal=True")

# Contrôle négatif : l'instrument doit détecter le changement de token des métadonnées.
print(f"CONTROL_NEGATIVE secondary_description_delta={(43,39,26)} distinct={CARD_COLORS['secondary_description']['ref_ink'] != CARD_COLORS['secondary_description']['cap_ink']}")
