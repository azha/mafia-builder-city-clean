# -*- coding: utf-8 -*-
from PIL import Image

def ouvrir(chemin):
    im = Image.open(chemin).convert('RGB')
    print('   [ouvert] %s  taille=%s' % (chemin, im.size))
    return im

def lum(c):
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def rel_lum(c):
    def f(v):
        v = v/255.0
        return v/12.92 if v <= 0.03928 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contraste(a, b):
    la, lb = rel_lum(a), rel_lum(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def bbox(im, pred, x0=0, y0=0, x1=None, y1=None, pas=1):
    p = im.load(); w, h = im.size
    x1 = w if x1 is None else x1; y1 = h if y1 is None else y1
    ax = ay = bx = by = None; n = 0
    for y in range(y0, y1, pas):
        for x in range(x0, x1, pas):
            if pred(p[x, y]):
                n += 1
                if ax is None or x < ax: ax = x
                if bx is None or x > bx: bx = x
                if ay is None or y < ay: ay = y
                if by is None or y > by: by = y
    return (ax, ay, bx, by, n)

def mediane_fenetre(im, cx, cy, r=4):
    p = im.load()
    ech = []
    for y in range(cy-r, cy+r+1):
        for x in range(cx-r, cx+r+1):
            ech.append(p[x, y])
    ech.sort(key=lum)
    return ech[len(ech)//2]

def profil_colonnes(im, y0, y1, pred, x0=0, x1=None):
    """retourne les segments [xa,xb] de colonnes contenant au moins 1 px pred"""
    p = im.load(); w, h = im.size
    x1 = w if x1 is None else x1
    col = []
    for x in range(x0, x1):
        ok = False
        for y in range(y0, y1):
            if pred(p[x, y]): ok = True; break
        col.append(ok)
    seg = []; deb = None
    for i, c in enumerate(col):
        if c and deb is None: deb = i
        if not c and deb is not None:
            seg.append((deb+x0, i-1+x0)); deb = None
    if deb is not None: seg.append((deb+x0, x1-1))
    return seg

def profil_lignes(im, x0, x1, pred, y0=0, y1=None):
    p = im.load(); w, h = im.size
    y1 = h if y1 is None else y1
    row = []
    for y in range(y0, y1):
        ok = False
        for x in range(x0, x1):
            if pred(p[x, y]): ok = True; break
        row.append(ok)
    seg = []; deb = None
    for i, c in enumerate(row):
        if c and deb is None: deb = i
        if not c and deb is not None:
            seg.append((deb+y0, i-1+y0)); deb = None
    if deb is not None: seg.append((deb+y0, y1-1))
    return seg
