from PIL import Image

def ouvrir(p):
    im = Image.open(p).convert('RGB')
    print(f"  [ouvert] {p} -> {im.size[0]}x{im.size[1]}")
    return im

def med(im, x0, y0, x1, y1):
    """mediane par canal d'une fenetre (x1,y1 exclus)"""
    px = im.load()
    r=[];g=[];b=[]
    for y in range(int(y0), int(y1)):
        for x in range(int(x0), int(x1)):
            c = px[x,y]; r.append(c[0]); g.append(c[1]); b.append(c[2])
    r.sort(); g.sort(); b.sort()
    n=len(r)
    return (r[n//2], g[n//2], b[n//2])

def lum(c):
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]

def srgb_lin(v):
    v = v/255.0
    return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4

def relL(c):
    return 0.2126*srgb_lin(c[0]) + 0.7152*srgb_lin(c[1]) + 0.0722*srgb_lin(c[2])

def contraste(c1, c2):
    a, b = relL(c1), relL(c2)
    if a < b: a, b = b, a
    return (a+0.05)/(b+0.05)

def profil_ligne(im, y, x0=None, x1=None):
    px = im.load(); W,H = im.size
    x0 = 0 if x0 is None else x0; x1 = W if x1 is None else x1
    return [px[x,y] for x in range(x0,x1)]

def profil_col(im, x, y0=None, y1=None):
    px = im.load(); W,H = im.size
    y0 = 0 if y0 is None else y0; y1 = H if y1 is None else y1
    return [px[x,y] for y in range(y0,y1)]

def transitions(vals, seuil=18):
    """indices ou la luminance saute de plus de `seuil`"""
    out=[]
    for i in range(1,len(vals)):
        if abs(lum(vals[i]) - lum(vals[i-1])) >= seuil:
            out.append(i)
    return out
