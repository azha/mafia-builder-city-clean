#!/usr/bin/env python3
"""Reperes: profil de lignes (luminance mediane par rangee) -> frontieres verticales.
Controle positif : la largeur de chaque image est imprimee et doit valoir 1080.
Controle negatif : la reference (2102) et la capture (2400) doivent donner des
frontieres DIFFERENTES en px absolus (sinon l'instrument lit le meme fichier)."""
from PIL import Image
import os, statistics

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def lum(p): return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def profil(path, x0=None, x1=None):
    im = Image.open(os.path.join(D, path)).convert('RGB')
    W, H = im.size
    print(f"  OUVERT {path}  taille={W}x{H}")
    if x0 is None: x0, x1 = 0, W
    px = im.load()
    out = []
    for y in range(H):
        vals = [lum(px[x, y]) for x in range(x0, x1, 4)]
        out.append(statistics.median(vals))
    return out, W, H

def frontieres(prof, seuil=3.0):
    """rangees ou la mediane saute de plus de `seuil`"""
    res = []
    for y in range(1, len(prof)):
        d = prof[y] - prof[y-1]
        if abs(d) >= seuil:
            res.append((y, round(prof[y-1],1), round(prof[y],1), round(d,1)))
    return res

for f in ['reference-1080x2102.png', 'capture-1080x2400.png',
          'capture-ecran-seul-1080x2400.png', 'capture-ecran-seul-1080x1920.png']:
    print(f"=== {f} ===")
    prof, W, H = profil(f)
    fr = frontieres(prof)
    print(f"  largeur={W} (controle positif: doit valoir 1080 -> {'OK' if W==1080 else 'ECHEC'})")
    print(f"  {len(fr)} frontieres (|delta median| >= 3):")
    for y, a, b, d in fr:
        print(f"    y={y:5d}  {a:6.1f} -> {b:6.1f}  ({d:+.1f})")
    print()
