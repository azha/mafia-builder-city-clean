#!/usr/bin/env python3
"""Inspection reproductible des quatre PNG du dossier aveugle.

Ce premier instrument ne suppose aucune structure UI : il imprime les tailles,
empreintes, couleurs dominantes et ruptures de couleur sur quelques axes fixes.
"""
from collections import Counter
from hashlib import sha256
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "reference-1080x2102.png",
    "capture-1080x2400.png",
    "capture-1080x1920.png",
    "capture-1080x1920-bas.png",
]


def runs(values, min_len=3):
    out = []
    start = 0
    for i in range(1, len(values) + 1):
        if i == len(values) or values[i] != values[start]:
            if i - start >= min_len:
                out.append((start, i - 1, values[start], i - start))
            start = i
    return out


for name in FILES:
    path = ROOT / name
    im = Image.open(path).convert("RGB")
    print(f"IMAGE {name} size={im.size} sha256={sha256(path.read_bytes()).hexdigest()}")
    counts = Counter(im.getdata())
    area = im.width * im.height
    print("  exact_palette_top12:")
    for rgb, n in counts.most_common(12):
        print(f"    {rgb}: {n} ({100*n/area:.3f}%)")
    q = im.quantize(colors=12, method=Image.Quantize.MEDIANCUT).convert("RGB")
    qcounts = Counter(q.getdata())
    print("  quantized_palette_12:")
    for rgb, n in qcounts.most_common():
        print(f"    {rgb}: {n} ({100*n/area:.3f}%)")
    for x in (0, 1, 45, 48, 49, 540, 1002, 1033, 1078, 1079):
        if x >= im.width:
            continue
        vals = [im.getpixel((x, y)) for y in range(im.height)]
        major = [r for r in runs(vals, min_len=12)]
        print(f"  vertical_exact_runs x={x}: {major[:40]}")
    print()

# Contrôle positif : les quatre fichiers annoncés ont la même largeur native.
widths = [Image.open(ROOT / n).width for n in FILES]
print(f"CONTROL_POSITIVE same_width_1080 widths={widths} result={len(set(widths)) == 1 and widths[0] == 1080}")

# Contrôle négatif : l'instrument doit distinguer les deux hauteurs principales.
h_ref = Image.open(ROOT / FILES[0]).height
h_cap = Image.open(ROOT / FILES[1]).height
print(f"CONTROL_NEGATIVE distinct_heights ref={h_ref} capture={h_cap} delta={h_cap-h_ref} result={h_ref != h_cap}")
