from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(nom):
    p = os.path.join(D, nom)
    im = Image.open(p).convert('RGB')
    print(f"  [ouvert] {nom} -> {im.size}")
    return im

def px(im): return im.load()

def lum(c):
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def srgb_lin(v):
    v = v/255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4

def rl(c):
    return 0.2126*srgb_lin(c[0]) + 0.7152*srgb_lin(c[1]) + 0.0722*srgb_lin(c[2])

def contraste(a, b):
    la, lb = rl(a), rl(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def mediane_fenetre(p, x, y, r=3):
    vals = [[],[],[]]
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            c = p[x+dx, y+dy]
            for k in range(3): vals[k].append(c[k])
    return tuple(sorted(v)[len(v)//2] for v in vals)

def dist(a,b):
    return max(abs(a[0]-b[0]), abs(a[1]-b[1]), abs(a[2]-b[2]))
