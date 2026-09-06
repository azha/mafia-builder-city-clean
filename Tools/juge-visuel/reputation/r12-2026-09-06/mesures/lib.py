"""Bibliotheque commune du juge r12. Aucune dependance hors PIL."""
from PIL import Image

def ouvrir(p):
    im = Image.open(p).convert('RGB')
    print(f"[ouvre] {p} -> {im.size}")
    return im

def px(im):
    return im.load()

def est_or(c, seuil=55):
    r,g,b = c
    return r > 110 and g > 75 and b < 130 and (r-b) > seuil and r > b

def lum(c):
    r,g,b = c
    return 0.2126*r + 0.7152*g + 0.0722*b

def srgb_lin(v):
    v = v/255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4

def wcag_L(c):
    r,g,b = c
    return 0.2126*srgb_lin(r) + 0.7152*srgb_lin(g) + 0.0722*srgb_lin(b)

def contraste(c1, c2):
    a, b = wcag_L(c1), wcag_L(c2)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def mediane_fenetre(p, x0, y0, x1, y1):
    rs, gs, bs = [], [], []
    for y in range(y0, y1):
        for x in range(x0, x1):
            r,g,b = p[x,y]; rs.append(r); gs.append(g); bs.append(b)
    rs.sort(); gs.sort(); bs.sort()
    n = len(rs)//2
    return (rs[n], gs[n], bs[n])

def lignes_or(im, xmin=None, xmax=None, seuil=55):
    """densite de pixels 'or' par ligne"""
    p = px(im); W,H = im.size
    xmin = 0 if xmin is None else xmin
    xmax = W if xmax is None else xmax
    return [sum(1 for x in range(xmin,xmax) if est_or(p[x,y], seuil)) for y in range(H)]

def colonnes_or(im, ymin=None, ymax=None, seuil=55):
    p = px(im); W,H = im.size
    ymin = 0 if ymin is None else ymin
    ymax = H if ymax is None else ymax
    return [sum(1 for y in range(ymin,ymax) if est_or(p[x,y], seuil)) for x in range(W)]

def bbox_masque(im, pred, x0=0, y0=0, x1=None, y1=None):
    p = px(im); W,H = im.size
    x1 = W if x1 is None else x1; y1 = H if y1 is None else y1
    mnx, mny, mxx, mxy, n = 10**9, 10**9, -1, -1, 0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(p[x,y]):
                n += 1
                if x<mnx: mnx=x
                if x>mxx: mxx=x
                if y<mny: mny=y
                if y>mxy: mxy=y
    if n == 0: return None
    return (mnx,mny,mxx,mxy,n)
