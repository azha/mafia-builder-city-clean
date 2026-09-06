#!/usr/bin/env python3
"""Reperes : frontieres horizontales majeures (bandeau, zone de contenu, dock)
sur la capture et sur les references d'etat.
Controle positif : la largeur de chaque image est imprimee ; la reference v4-1
doit rendre exactement 900 de large et la capture 1080."""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def prof(path):
    im = Image.open(os.path.join(D, path)).convert('RGB')
    print(f"  ouvert: {path}  taille={im.size}")
    w, h = im.size
    px = im.load()
    rows = []
    for y in range(h):
        s = 0
        for x in range(0, w, 4):
            r, g, b = px[x, y]
            s += 0.2126*r + 0.7152*g + 0.0722*b
        rows.append(s / (w//4))
    return im, rows

def frontieres(rows, seuil=6.0):
    """y ou la luminance moyenne saute de plus de `seuil` d'une ligne a l'autre"""
    out = []
    for y in range(1, len(rows)):
        d = rows[y] - rows[y-1]
        if abs(d) >= seuil:
            out.append((y, round(rows[y-1],1), round(rows[y],1), round(d,1)))
    return out

for p in ['capture-1080x2400.png', 'etats/v4-1.png', 'reference-1080x2102.png',
          'capture-seuil-force-1080x2400.png']:
    print(f"\n=== {p} ===")
    im, rows = prof(p)
    print(f"  luminance moyenne globale = {sum(rows)/len(rows):.2f}")
    fr = frontieres(rows)
    print(f"  frontieres (|delta|>=6) : {len(fr)}")
    for f in fr[:60]:
        print(f"    y={f[0]:4d}  {f[1]:6.1f} -> {f[2]:6.1f}  (d={f[3]:+.1f})")
