#!/usr/bin/env python3
"""INSTRUMENT 3 — la reserve de lisibilite : ou poser un texte court, et ce qu'il y vaut.

Grandeur : la fenetre de 60% de largeur x 20% de hauteur dont la luminance percue est la
plus UNIFORME (sigma minimale), balayee au pas de 8 px via images integrales (somme et
somme des carres). Puis, sur la fenetre gagnante et A PLEINE RESOLUTION : les percentiles
p05 / p50 / p95 de la luminance RELATIVE (WCAG), et le contraste qu'y auraient --creme
#eae0c8 et --encre #0b1016.

Pourquoi p05/p95 et pas seulement la mediane : une fenetre peut etre calme EN MOYENNE et
porter un eclat qui casse le texte localement. Une mediane seule est la version la plus
degeneree du monde qui rend l'assertion vraie.
"""
import os, sys
from array import array
from PIL import Image

CREME = (0xea, 0xe0, 0xc8)
ENCRE = (0x0b, 0x10, 0x16)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))
_LIN = [(u / 255 / 12.92) if (u / 255) <= 0.04045 else (((u / 255) + 0.055) / 1.055) ** 2.4 for u in range(256)]


def lrel(c):
    return 0.2126 * _LIN[c[0]] + 0.7152 * _LIN[c[1]] + 0.0722 * _LIN[c[2]]


def contraste(a, b):
    la, lb = (a if isinstance(a, float) else lrel(a)), (b if isinstance(b, float) else lrel(b))
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def zone_calme(im, fw=0.60, fh=0.20, pas=8):
    W, H = im.size
    px = im.load()
    ww, hh = int(W * fw), int(H * fh)
    S = array('q', [0]) * ((W + 1) * (H + 1))
    Q = array('q', [0]) * ((W + 1) * (H + 1))
    for y in range(H):
        ls = lq = 0
        b0, b1 = y * (W + 1), (y + 1) * (W + 1)
        for x in range(W):
            r, g, b = px[x, y]
            v = (2126 * r + 7152 * g + 722 * b) // 10000  # luma perçue 0-255
            ls += v; lq += v * v
            Q[b1 + x + 1] = Q[b0 + x + 1] + lq
            S[b1 + x + 1] = S[b0 + x + 1] + ls
    n = ww * hh
    best = None
    for y in range(0, H - hh + 1, pas):
        for x in range(0, W - ww + 1, pas):
            a, bb = y * (W + 1), (y + hh) * (W + 1)
            s = S[bb + x + ww] - S[bb + x] - S[a + x + ww] + S[a + x]
            q = Q[bb + x + ww] - Q[bb + x] - Q[a + x + ww] + Q[a + x]
            var = q / n - (s / n) ** 2
            if best is None or var < best[0]:
                best = (var, x, y)
    var, x, y = best
    return (var ** 0.5 if var > 0 else 0.0), x, y, ww, hh


def percentiles(im, x, y, w, h):
    px = im.load()
    vals = sorted(lrel(px[i, j]) for j in range(y, y + h) for i in range(x, x + w))
    n = len(vals)
    return vals[int(0.05 * n)], vals[n // 2], vals[int(0.95 * n)]


def controle_positif():
    print("== CONTROLE POSITIF ==")
    ok = True
    c = contraste(CREME, ENCRE)
    print(f"  contraste --creme/--encre = {c:.2f}:1  (symetrique : {contraste(ENCRE, CREME):.2f}) ; contraste(x,x) = {contraste(CREME, CREME):.2f}")
    ok &= abs(c - contraste(ENCRE, CREME)) < 1e-9 and abs(contraste(CREME, CREME) - 1.0) < 1e-9 and c > 13
    # CONTROLE QUI DISCRIMINE : bande calme posee a une position CONNUE, bruit partout ailleurs.
    W = H = 200
    im = Image.new("RGB", (W, H))
    p = im.load()
    for j in range(H):
        for i in range(W):
            if 120 <= j < 160:
                p[i, j] = (22, 28, 43)                        # bande calme, y=120..159
            else:
                p[i, j] = (22, 28, 43) if (i * 7 + j * 13) % 3 else (234, 224, 200)
    s, x, y, w, h = zone_calme(im, pas=4)
    print(f"  synthetique {im.size} bande calme posee a y=120..159 -> trouvee y={y} (h={h}) sigma={s:.3f}")
    ok &= (s < 0.01 and 120 <= y <= 160 - h)
    a, b, cc = percentiles(im, x, y, w, h)
    print(f"  sur la bande : p05=p50=p95={a:.4f}/{b:.4f}/{cc:.4f} ; contraste creme={contraste(CREME, b):.2f}:1 encre={contraste(ENCRE, b):.2f}:1")
    ok &= abs(a - cc) < 1e-9
    print("  ->", "OK" if ok else "ECHEC")
    return ok


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    print("\n== ZONE CALME (fenetre 614x204 = 60%x20%, pas 8 px) ==")
    print("    id  fichier                  taille    x,y de la fenetre  sigma(luma 0-255)   L p05/p50/p95     creme p50  encre p50  creme p95(pire)")
    for i, f in enumerate(IMAGES, 1):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        s, x, y, w, h = zone_calme(im)
        p5, p50, p95 = percentiles(im, x, y, w, h)
        pos = "haut" if y + h / 2 < im.size[1] / 3 else ("milieu" if y + h / 2 < 2 * im.size[1] / 3 else "bas")
        print(f"    E{i:<3}{f:<24} {im.size[0]}x{im.size[1]}  ({x:4d},{y:4d}) {pos:<7} sigma={s:6.2f}   "
              f"{p5:.4f}/{p50:.4f}/{p95:.4f}   {contraste(CREME,p50):6.2f}:1  {contraste(ENCRE,p50):5.2f}:1   {contraste(CREME,p95):6.2f}:1")
