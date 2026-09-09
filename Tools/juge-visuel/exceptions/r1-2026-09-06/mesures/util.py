# util.py — helpers communs du juge visuel ⑨ (r1). Aucun chiffre du rapport ne sort d'ailleurs.
from PIL import Image
import os, statistics

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

REF   = os.path.join(D, "reference-⑨-1080x2102.png")
CAP   = os.path.join(D, "capture-1080x2400.png")
CAPSC = os.path.join(D, "capture-sans-chrome-declaree-1080x2400.png")
CANON = os.path.join(D, "ecran-canon.png")
V414  = os.path.join(D, "v4-14.png")

def ouvrir(p):
    im = Image.open(p).convert("RGB")
    print(f"  [ouvre] {os.path.basename(p)} : {im.size[0]}x{im.size[1]} {im.mode}")
    return im

def lum(c):
    # luminance relative WCAG
    def f(v):
        v = v/255.0
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contraste(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi+0.05)/(lo+0.05)

def mediane_fenetre(im, cx, cy, r=4):
    px = im.load()
    W, H = im.size
    rs, gs, bs = [], [], []
    for y in range(max(0,cy-r), min(H,cy+r+1)):
        for x in range(max(0,cx-r), min(W,cx+r+1)):
            c = px[x,y]; rs.append(c[0]); gs.append(c[1]); bs.append(c[2])
    return (int(statistics.median(rs)), int(statistics.median(gs)), int(statistics.median(bs)))

def profil_lignes(im, x0=0, x1=None):
    """luminance moyenne (0-255 approx) par ligne"""
    px = im.load(); W, H = im.size
    if x1 is None: x1 = W
    out = []
    for y in range(H):
        s = 0
        for x in range(x0, x1, 2):
            c = px[x,y]; s += (c[0]*299 + c[1]*587 + c[2]*114)//1000
        out.append(s / len(range(x0, x1, 2)))
    return out

def profil_colonnes(im, y0, y1):
    px = im.load(); W, H = im.size
    out = []
    for x in range(W):
        s = 0
        for y in range(y0, y1):
            c = px[x,y]; s += (c[0]*299 + c[1]*587 + c[2]*114)//1000
        out.append(s / (y1-y0))
    return out

def bbox_encre(im, x0, y0, x1, y1, seuil_lum, plus_clair=True):
    """bbox des pixels dont la luminance dépasse (ou est sous) le seuil, dans la fenêtre"""
    px = im.load()
    minx, miny, maxx, maxy, n = 10**9, 10**9, -1, -1, 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x,y]; L = (c[0]*299 + c[1]*587 + c[2]*114)/1000
            ok = (L >= seuil_lum) if plus_clair else (L <= seuil_lum)
            if ok:
                n += 1
                if x < minx: minx = x
                if x > maxx: maxx = x
                if y < miny: miny = y
                if y > maxy: maxy = y
    if n == 0: return None
    return (minx, miny, maxx, maxy, n)

def palette(im, boite=None, k=8):
    r = im.crop(boite) if boite else im
    q = r.convert("RGB").quantize(colors=k, method=Image.MEDIANCUT).convert("RGB")
    cols = q.getcolors(1<<24)
    cols.sort(reverse=True)
    tot = sum(c for c,_ in cols)
    return [(c/tot*100.0, rgb) for c, rgb in cols[:k]]
