#!/usr/bin/env python3
# Profil de lignes : mediane RGB par ligne, pour reperer chrome haut / dock bas / fond.
# Imprime la TAILLE de chaque image ouverte (regle du mandat).
import sys, os
from PIL import Image

def med(vals):
    vals = sorted(vals)
    return vals[len(vals)//2]

def profil(path, step=8):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    print(f"IMAGE {os.path.basename(path)}  taille={w}x{h}")
    px = im.load()
    xs = range(4, w-4, 16)
    out = []
    for y in range(0, h, step):
        r = med([px[x, y][0] for x in xs])
        g = med([px[x, y][1] for x in xs])
        b = med([px[x, y][2] for x in xs])
        out.append((y, r, g, b))
    return (w, h, out)

if __name__ == '__main__':
    for p in sys.argv[1:]:
        w, h, out = profil(p)
        prev = None
        for (y, r, g, b) in out:
            cur = (r, g, b)
            if prev is None or max(abs(cur[i]-prev[i]) for i in range(3)) > 6:
                print(f"  y={y:5d}  rgb=({r:3d},{g:3d},{b:3d})")
                prev = cur
