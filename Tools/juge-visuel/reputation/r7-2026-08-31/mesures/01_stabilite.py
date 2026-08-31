#!/usr/bin/env python3
"""Contrôle de stabilité T vs T+1s : compte les pixels différents.
Contrôle positif : image comparee a elle-meme => 0.
Contrôle negatif : 1920 vs 2400 recadree => != 0 (l'instrument discrimine)."""
from PIL import Image, ImageChops
D = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"

def diff(a, b):
    n = 0; mx = 0
    pa, pb = a.load(), b.load()
    w, h = a.size
    for y in range(h):
        for x in range(w):
            ca, cb = pa[x, y], pb[x, y]
            d = max(abs(ca[i] - cb[i]) for i in range(3))
            if d > 0:
                n += 1
                mx = max(mx, d)
    return n, mx

t0 = Image.open(D + "screen_b3_reputation_1080x1920.png").convert("RGB")
t1 = Image.open(D + "screen_b3_reputation_1080x1920_t1s.png").convert("RGB")
print("T0", t0.size, "T1", t1.size)
print("CTRL+ (T0 vs T0) diff px =", diff(t0, t0))
n, mx = diff(t0, t1)
print("T0 vs T1s : pixels differents =", n, " delta max canal =", mx)
t2 = Image.open(D + "screen_b3_reputation_1080x2400.png").convert("RGB").crop((0, 0, 1080, 1920))
print("CTRL- (T0 vs 2400 recadree) diff px =", diff(t0, t2))
