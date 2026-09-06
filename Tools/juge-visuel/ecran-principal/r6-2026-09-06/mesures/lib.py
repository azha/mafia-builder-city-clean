from PIL import Image
import math

REF   = '../ecran-canon.png'          # 1176x2091, 392 CSS -> x3.0
CAP19 = '../capture-fiche-1080x1920.png'
CAP24 = '../capture-fiche-1080x2400.png'
DIS24 = '../capture-district-1080x2400.png'

S_REF = 3.0
S_CAP = 1080.0/392.0     # 2.7551020408

def load(p):
    im = Image.open(p).convert('RGB')
    print(f"  [ouvert] {p} {im.size}")
    return im

def px(im,x,y):
    return im.getpixel((int(x),int(y)))

def lum(c):
    return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def srgb_lin(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4

def rel_lum(c):
    return 0.2126*srgb_lin(c[0])+0.7152*srgb_lin(c[1])+0.0722*srgb_lin(c[2])

def contrast(a,b):
    la,lb=rel_lum(a),rel_lum(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

def median(vs):
    vs=sorted(vs)
    n=len(vs)
    if n==0: return None
    return vs[n//2] if n%2 else (vs[n//2-1]+vs[n//2])/2.0

def med_win(im,x,y,r=3):
    """median colour of a (2r+1)^2 window, per channel"""
    out=[]
    for ch in range(3):
        vs=[im.getpixel((int(x)+dx,int(y)+dy))[ch] for dx in range(-r,r+1) for dy in range(-r,r+1)]
        out.append(median(vs))
    return tuple(out)
