#!/usr/bin/env python3
"""m11 — (a) stabilite T / T+1 s : compte des pixels differents. (b) capture 1080x2400 :
le cadre, ses reperes principaux, et les memes rapports internes qu'en 1080x1920.
Controle positif (a): comparer 1080x1920 a LUI-MEME doit donner 0 pixel different.
Controle negatif (a): comparer 1080x1920 a la reference redimensionnee doit donner >>0."""
from PIL import Image

D = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
A = D + "screen_b3_reputation_1080x1920.png"
B = D + "screen_b3_reputation_1080x1920_t1s.png"
C = D + "screen_b3_reputation_1080x2400.png"
REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r8-2026-08-31/reference/m-120.png"


def diff(p1, p2):
    i1 = Image.open(p1).convert("RGB"); i2 = Image.open(p2).convert("RGB")
    print(f"  {p1.split('/')[-1]} {i1.size}  vs  {p2.split('/')[-1]} {i2.size}")
    if i1.size != i2.size:
        i2 = i2.resize(i1.size)
    a = i1.load(); b = i2.load()
    n = 0; mx = 0
    for y in range(i1.size[1]):
        for x in range(i1.size[0]):
            d = max(abs(u - v) for u, v in zip(a[x, y], b[x, y]))
            if d > 2:
                n += 1
                mx = max(mx, d)
    return n, mx, i1.size[0] * i1.size[1]


print("=== (a) stabilite ===")
n, mx, tot = diff(A, B)
print(f"  T vs T+1s : {n} px differents (>2/255) sur {tot}  ({100*n/tot:.4f} %)  ecart max={mx}")
n2, mx2, _ = diff(A, A)
print(f"  [ctrl +] A vs A : {n2} px (attendu 0)")
n3, mx3, _ = diff(A, REF)
print(f"  [ctrl -] A vs reference redimensionnee : {n3} px (attendu >> 0), max={mx3}")

print("=== (b) 1080x2400 ===")


def is_gold(p):
    r, g, b = p[:3]
    return r > 150 and 110 < g < 210 and b < 130 and r - b > 60


for p, sc in ((A, 3.6), (C, 3.6)):
    im = Image.open(p).convert("RGB"); px = im.load()
    W, H = im.size
    colc = [sum(1 for y in range(0, H, 2) if is_gold(px[x, y])) for x in range(W)]
    rowc = [sum(1 for x in range(0, W, 2) if is_gold(px[x, y])) for y in range(H)]
    cols = [x for x, c in enumerate(colc) if c > max(colc) * 0.5]
    rows = [y for y, c in enumerate(rowc) if c > max(rowc) * 0.5]
    print(f"  {p.split('/')[-1]} {im.size} cadre px=({min(cols)},{min(rows)},{max(cols)},{max(rows)})"
          f"  CSS l={(max(cols)-min(cols)+1)/sc:.1f} h={(max(rows)-min(rows)+1)/sc:.1f}"
          f"  top={min(rows)/sc:.1f}")
    # rien sous le cadre ? luminance max sous le bas du cadre
    yb = max(rows) + 4
    if yb < H - 4:
        mxl = max(max(px[x, y]) for y in range(yb, H, 3) for x in range(0, W, 5))
        print(f"    sous le cadre (y={yb}..{H}) : canal max = {mxl} (fond seul si faible)")
