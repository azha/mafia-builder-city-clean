# Helpers communs — juge visuel r15 ㊲
# Convention de BORD (declaree) : mi-alpha = croisement a mi-hauteur entre le
# plateau du fond local et le plateau de l'objet, interpole lineairement.
from PIL import Image
import os, math

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(nom):
    p = os.path.join(D, nom)
    im = Image.open(p).convert('RGB')
    print(f"  [ouvre] {nom}  {im.size[0]}x{im.size[1]}")
    return im

def px(im):
    return im.load()

def lum(c):
    # luminance perceptuelle simple (0..255) pour les profils
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def srgb_lin(v):
    v = v/255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4

def L(c):
    return 0.2126*srgb_lin(c[0]) + 0.7152*srgb_lin(c[1]) + 0.0722*srgb_lin(c[2])

def contraste(c1, c2):
    a, b = L(c1), L(c2)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def mediane(vals):
    v = sorted(vals)
    n = len(v)
    if n == 0: return 0
    return v[n//2] if n % 2 else 0.5*(v[n//2-1]+v[n//2])

def percentile(vals, p):
    v = sorted(vals)
    if not v: return 0
    k = (len(v)-1)*p/100.0
    f = math.floor(k); c = math.ceil(k)
    if f == c: return v[int(k)]
    return v[f]*(c-k) + v[c]*(k-f)

def mediane_couleur(im, x0, y0, x1, y1):
    p = im.load()
    R=[];G=[];B=[]
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = p[x,y]; R.append(c[0]); G.append(c[1]); B.append(c[2])
    return (round(mediane(R)), round(mediane(G)), round(mediane(B)))

def profil_rangees(im, x0, x1, y0, y1, f=lum, agg=mediane):
    """valeur agregee par rangee y sur la bande [x0..x1]"""
    p = im.load()
    out = []
    for y in range(y0, y1+1):
        out.append((y, agg([f(p[x,y]) for x in range(x0, x1+1)])))
    return out

def profil_colonnes(im, y0, y1, x0, x1, f=lum, agg=mediane):
    p = im.load()
    out = []
    for x in range(x0, x1+1):
        out.append((x, agg([f(p[x,y]) for y in range(y0, y1+1)])))
    return out

def mi_alpha(prof, i_pic, sens, fond=None, pic=None):
    """prof = [(coord, val)]; trouve le croisement a mi-hauteur en partant de i_pic
    vers +1 (sens=1) ou -1 (sens=-1). Interpolation lineaire."""
    vals = [v for _, v in prof]
    coords = [c for c, _ in prof]
    if pic is None: pic = vals[i_pic]
    if fond is None:
        fond = percentile(vals, 10)
    mid = (pic + fond)/2.0
    i = i_pic
    while 0 <= i+sens < len(vals) and vals[i+sens] >= mid:
        i += sens
    j = i + sens
    if not (0 <= j < len(vals)): return coords[i]
    v1, v2 = vals[i], vals[j]
    if v1 == v2: return coords[i]
    t = (v1 - mid)/(v1 - v2)
    return coords[i] + t*(coords[j]-coords[i])

def bandes(prof, seuil):
    """runs contigus ou val >= seuil ; rend [(c0,c1,pic)]"""
    out = []
    cur = None
    for c, v in prof:
        if v >= seuil:
            if cur is None: cur = [c, c, v]
            else:
                cur[1] = c; cur[2] = max(cur[2], v)
        else:
            if cur is not None: out.append(tuple(cur)); cur = None
    if cur is not None: out.append(tuple(cur))
    return out
