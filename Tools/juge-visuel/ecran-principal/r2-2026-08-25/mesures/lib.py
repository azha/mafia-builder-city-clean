"""Helpers communs. Aucun numpy sur cette machine : tout en pur Python + PIL."""
from PIL import Image
import os, statistics

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CANON = os.path.join(D, 'ecran-canon.png')
CAP16 = os.path.join(D, 'capture-1080x1920.png')
CAP24 = os.path.join(D, 'capture-1080x2400.png')

def open_img(path):
    im = Image.open(path).convert('RGB')
    print(f"  [ouvert] {os.path.basename(path)}  {im.size[0]}x{im.size[1]}")
    return im

# echelles : 1 px CSS = W/392
def css(im):
    return im.size[0] / 392.0

def med_window(im, cx, cy, r=3):
    """mediane par canal d'une fenetre (2r+1)^2 centree en (cx,cy)."""
    px = im.load(); W,H = im.size
    R,G,B = [],[],[]
    cy=max(r,min(H-1-r,cy)); cx=max(r,min(W-1-r,cx))
    for y in range(max(0,cy-r), min(H,cy+r+1)):
        for x in range(max(0,cx-r), min(W,cx+r+1)):
            p = px[x,y]; R.append(p[0]); G.append(p[1]); B.append(p[2])
    return (int(statistics.median(R)), int(statistics.median(G)), int(statistics.median(B)))

def row_mean(im, y, x0=None, x1=None):
    px = im.load(); W,H = im.size
    x0 = 0 if x0 is None else x0; x1 = W if x1 is None else x1
    s = 0
    for x in range(x0, x1):
        p = px[x,y]; s += (p[0]+p[1]+p[2])
    return s / (3.0*(x1-x0))

def col_mean(im, x, y0, y1):
    px = im.load()
    s = 0
    for y in range(y0, y1):
        p = px[x,y]; s += (p[0]+p[1]+p[2])
    return s / (3.0*(y1-y0))

def lin(c):
    c = c/255.0
    return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4

def L(rgb):
    return 0.2126*lin(rgb[0]) + 0.7152*lin(rgb[1]) + 0.0722*lin(rgb[2])

def contrast(a, b):
    la, lb = L(a), L(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def hexc(rgb):
    return '#%02x%02x%02x' % rgb

def ink_bbox(im, x0,y0,x1,y1, bg, tol=18):
    """bbox de l'ENCRE dans un rect : pixels dont la distance L1 a bg depasse tol*3."""
    px = im.load()
    minx,miny,maxx,maxy = 10**9,10**9,-1,-1
    n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]) > tol*3:
                n+=1
                if x<minx: minx=x
                if x>maxx: maxx=x
                if y<miny: miny=y
                if y>maxy: maxy=y
    if maxx<0: return None
    return (minx,miny,maxx,maxy,n)

def rows_with_ink(im, x0,y0,x1,y1, bg, tol=18):
    px=im.load(); out=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            p=px[x,y]
            if abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]) > tol*3: n+=1
        out.append((y,n))
    return out

def cols_with_ink(im, x0,y0,x1,y1, bg, tol=18):
    px=im.load(); out=[]
    for x in range(x0,x1):
        n=0
        for y in range(y0,y1):
            p=px[x,y]
            if abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]) > tol*3: n+=1
        out.append((x,n))
    return out

def runs(seq, pred):
    """seq = [(i,v)] ; rend les plages continues ou pred(v) est vrai."""
    out=[]; cur=None
    for i,v in seq:
        if pred(v):
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur is not None: out.append(tuple(cur)); cur=None
    if cur is not None: out.append(tuple(cur))
    return out
