"""Helpers communs du juge r9. PIL seulement, pas de numpy."""
from PIL import Image
import os, math

D = os.path.dirname(os.path.abspath(__file__))
R = os.path.dirname(D)

CANON   = os.path.join(R, 'ecran-canon.png')
DIST    = os.path.join(R, 'capture-district-1080x2400.png')
F1920   = os.path.join(R, 'capture-fiche-1080x1920.png')
F2400   = os.path.join(R, 'capture-fiche-1080x2400.png')

# Echelle imposee par dossier.md
SC_CANON = 3.0        # 1176 px = 392 CSS
SC_CAPT  = 1080/392.0 # 2.755102...

def ouvrir(p, quoi=''):
    im = Image.open(p).convert('RGB')
    print('  [ouvre] %-34s %s %s' % (os.path.basename(p), im.size, quoi))
    return im

def med(vals):
    v = sorted(vals)
    n = len(v)
    if n == 0: return None
    return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])/2.0

def medrgb(px, x0, y0, x1, y1):
    """mediane par canal d'une fenetre [x0,x1) x [y0,y1)"""
    rs, gs, bs = [], [], []
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            r, g, b = px[x, y]
            rs.append(r); gs.append(g); bs.append(b)
    return (med(rs), med(gs), med(bs))

def lum(c):
    """luminance relative WCAG"""
    def f(u):
        u = u/255.0
        return u/12.92 if u <= 0.03928 else ((u+0.055)/1.055)**2.4
    return 0.2126*f(c[0]) + 0.7152*f(c[1]) + 0.0722*f(c[2])

def contraste(a, b):
    la, lb = lum(a), lum(b)
    if la < lb: la, lb = lb, la
    return (la+0.05)/(lb+0.05)

def L(c):
    """clarte 0..100 approx (Lab L*) depuis la luminance relative"""
    y = lum(c)
    return 116*(y**(1/3.0))-16 if y > 0.008856 else 903.3*y

def srgb_vers_lin(u):
    u = u/255.0
    return u/12.92 if u <= 0.04045 else ((u+0.055)/1.055)**2.4

def lin_vers_srgb(v):
    v = max(0.0, min(1.0, v))
    s = 12.92*v if v <= 0.0031308 else 1.055*(v**(1/2.4))-0.055
    return s*255.0

def melange_srgb(dessus, alpha, dessous):
    return tuple(alpha*dessus[i] + (1-alpha)*dessous[i] for i in range(3))

def melange_lineaire(dessus, alpha, dessous):
    out = []
    for i in range(3):
        a = srgb_vers_lin(dessus[i]); b = srgb_vers_lin(dessous[i])
        out.append(lin_vers_srgb(alpha*a + (1-alpha)*b))
    return tuple(out)

def dist_rgb(a, b):
    return max(abs(a[i]-b[i]) for i in range(3))

def hexa(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

# jetons de la source
TOK = {
  'encre':(11,16,22), 'panneau':(17,24,35), 'lisere':(42,54,72),
  'creme':(234,224,200), 'creme2':(185,173,146), 'or':(217,171,78),
  'orvif':(242,201,107), 'laiton':(176,141,62), 'braise':(224,102,74), 'cyan':(127,212,217),
}
