"""Bibliotheque commune du juge r16 (PIL seulement, pas de numpy)."""
from PIL import Image
import os

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(nom):
    p = os.path.join(DOSSIER, nom)
    im = Image.open(p).convert('RGB')
    print("[ouvre] %-34s %s  reel=%s" % (nom, im.size, os.path.realpath(p).split('juge-visuel/')[-1]))
    return im

def lum(c):
    """luminance perceptuelle simple (0..255), la meme des deux cotes."""
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def srgb_lin(v):
    v = v/255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4

def L_rel(c):
    return 0.2126*srgb_lin(c[0]) + 0.7152*srgb_lin(c[1]) + 0.0722*srgb_lin(c[2])

def contraste(c1, c2):
    a, b = L_rel(c1), L_rel(c2)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def mediane(vals):
    v = sorted(vals)
    n = len(v)
    if n == 0: return None
    return v[n//2] if n % 2 else 0.5*(v[n//2-1]+v[n//2])

def mediane_fenetre(px, x, y, r=3):
    R=[];G=[];B=[]
    for j in range(y-r, y+r+1):
        for i in range(x-r, x+r+1):
            c = px[i, j]; R.append(c[0]); G.append(c[1]); B.append(c[2])
    return (int(mediane(R)), int(mediane(G)), int(mediane(B)))

def est_or(c, seuil=1.0):
    """or/laiton : R > G > B nettement, R assez haut."""
    r,g,b = c
    return r > 110 and r > g+15 and g > b+25

def profil_colonne(im, x, y0, y1):
    px = im.load()
    return [lum(px[x, y]) for y in range(y0, y1)]

def profil_ligne(im, y, x0, x1):
    px = im.load()
    return [lum(px[x, y]) for x in range(x0, x1)]

def bord_mi_alpha(vals, i0, i1, sens=+1):
    """cherche le franchissement de mi-hauteur entre min et max sur [i0,i1)."""
    seg = vals[i0:i1]
    lo, hi = min(seg), max(seg)
    mid = 0.5*(lo+hi)
    rng = range(i0, i1-1) if sens > 0 else range(i1-2, i0-1, -1)
    for i in rng:
        a, b = vals[i], vals[i+1]
        if (a < mid <= b) or (b < mid <= a):
            if b != a:
                return i + (mid-a)/(b-a)
            return i+0.5
    return None
