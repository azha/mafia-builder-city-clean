"""Outils communs du juge r14. Aucun reglage cache : tout seuil est un argument nomme.

CONVENTION DE BORD (declaree, valable pour TOUT script de ce tour) :
  le bord d'un trait (filet, rail, boite) est la premiere ligne/colonne ou la
  luminance franchit la MI-HAUTEUR entre le plateau du fond et le plateau de
  l'encre, mesuree sur la mediane de la bande. Le "coeur" est l'extremum.
  Les bbox d'encre sont donnees INCLUSIVES (x0..x1 = premier..dernier px d'encre).
"""
from PIL import Image

def ouvrir(p):
    im = Image.open(p).convert('RGB')
    print(f"  [ouvert] {p}  {im.size[0]}x{im.size[1]}")
    return im

def lum(px):
    r, g, b = px
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def Y(px):
    r, g, b = px
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contraste(a, b):
    ya, yb = Y(a), Y(b)
    hi, lo = max(ya, yb), min(ya, yb)
    return (hi + 0.05) / (lo + 0.05)

def mediane(vals):
    v = sorted(vals)
    n = len(v)
    if n == 0:
        return None
    return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2.0

def med_fenetre(im, cx, cy, r=3):
    px = im.load()
    W, H = im.size
    canaux = [[], [], []]
    for y in range(max(0, cy - r), min(H, cy + r + 1)):
        for x in range(max(0, cx - r), min(W, cx + r + 1)):
            p = px[x, y]
            for i in range(3):
                canaux[i].append(p[i])
    return tuple(int(round(mediane(c))) for c in canaux)

def profil_lignes(im, x0, x1, y0, y1):
    """mediane de luminance par LIGNE sur la bande x0..x1 (inclusif)."""
    px = im.load()
    out = []
    for y in range(y0, y1 + 1):
        out.append(mediane([lum(px[x, y]) for x in range(x0, x1 + 1)]))
    return out

def profil_colonnes(im, x0, x1, y0, y1):
    px = im.load()
    out = []
    for x in range(x0, x1 + 1):
        out.append(mediane([lum(px[x, y]) for y in range(y0, y1 + 1)]))
    return out

def bbox_encre(im, x0, y0, x1, y1, seuil):
    """bbox INCLUSIVE des px dont la luminance depasse `seuil`."""
    px = im.load()
    xs, ys = [], []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if lum(px[x, y]) >= seuil:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return (min(xs), min(ys), max(xs), max(ys), len(xs))
