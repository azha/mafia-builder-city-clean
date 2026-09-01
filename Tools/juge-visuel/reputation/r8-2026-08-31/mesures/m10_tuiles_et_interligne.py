#!/usr/bin/env python3
"""m10 — (a) halo interieur des tuiles de statistique : profil de luminance le long d'une ligne
horizontale traversant la tuile 1 SOUS le chiffre ; (b) interligne du paragraphe du verdict
(positions des lignes d'encre). Repere m01, unites CSS.
Controle positif (a): le fond HORS tuile (entre deux tuiles) doit etre le meme des deux cotes.
Controle negatif (b): la detection de lignes doit trouver 3 lignes de paragraphe des deux cotes."""
from PIL import Image

REF = ("/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png", 3.0, 18, 376)
CAP = ("/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png", 3.6, 18, 18)


def lum(px, x, y, n=2):
    v = [sum(px[x + dx, y + dy][:3]) / 3 for dx in range(-n, n + 1) for dy in range(-n, n + 1)]
    return sorted(v)[len(v) // 2]


print("=== (a) profil horizontal a travers la tuile 1 (sous le chiffre) ===")
for n, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
    im = Image.open(p).convert("RGB"); px = im.load()
    y = int(t + (86 if n == "REF" else 84) * sc)
    prof = [(x, round(lum(px, int(l + x * sc), y), 1)) for x in range(12, 122, 5)]
    print(f"  {n} {p.split('/')[-1]} {im.size} ligne y_css={(y-t)/sc:.1f}")
    print("   ", " ".join(f"{x}:{v:.0f}" for x, v in prof))
    inside = [v for x, v in prof if 22 <= x <= 96]
    outside = [v for x, v in prof if x >= 106]
    print(f"    tuile1 interieur min/max = {min(inside):.1f}/{max(inside):.1f}  amplitude={max(inside)-min(inside):.1f}"
          f"   [ctrl+] hors tuile = {sum(outside)/len(outside):.1f}")

print("=== (b) lignes d'encre du paragraphe du verdict ===")
for n, (p, sc, l, t) in (("REF", REF), ("CAP", CAP)):
    im = Image.open(p).convert("RGB"); px = im.load()
    y0 = int(t + (372 if n == "REF" else 368) * sc); y1 = int(t + 408 * sc)
    x0 = int(l + 24 * sc); x1 = int(l + 275 * sc)
    rows = []
    for y in range(y0, y1):
        c = sum(1 for x in range(x0, x1, 2) if sum(px[x, y][:3]) / 3 > 60)
        rows.append((y, c))
    runs = []
    cur = None
    for y, c in rows:
        if c > 3 and cur is None:
            cur = y
        elif c <= 3 and cur is not None:
            runs.append(((cur - t) / sc, (y - t) / sc)); cur = None
    if cur:
        runs.append(((cur - t) / sc, (y1 - t) / sc))
    runs = [r for r in runs if r[1] - r[0] > 2]
    print(f"  {n} {im.size} : {len(runs)} lignes")
    prev = None
    for a, b in runs:
        d = "" if prev is None else f"  pas={a-prev:.2f}"
        print(f"    {a:.1f} -> {b:.1f}  h={b-a:.1f}{d}")
        prev = a
