import sys; sys.path.insert(0,'.')
from lib import *

def liseres(im, xs, y0, y1, dl=3.0):
    """le long d'une colonne x, reperer les pics locaux de luminance (liseres de panneau)"""
    p = px(im)
    prof = []
    for y in range(y0,y1):
        v = sum(lum(p[x,y]) for x in xs)/len(xs)
        prof.append(v)
    pics=[]
    for i in range(2,len(prof)-2):
        if prof[i] - min(prof[i-2],prof[i+2]) > dl and prof[i] >= prof[i-1] and prof[i] >= prof[i+1]:
            pics.append((y0+i, round(prof[i],1), round(prof[i]-min(prof[i-2],prof[i+2]),1)))
    # fusionner
    out=[]
    for y,v,d in pics:
        if out and y - out[-1][0] <= 4: continue
        out.append((y,v,d))
    return out

CAS = [
 ('REF   ','../reference-1080x2102.png', 452, 2078),
 ('C2400 ','../capture-1080x2400.png',   482, 2109),
 ('C1920 ','../capture-1080x1920.png',   250, 1629),
 ('S2400 ','../capture-ecran-seul-1080x2400.png', 730, 2109),
]
print("=== m05 : liseres de panneau le long d'une colonne pres du bord gauche interieur ===")
for nom,f,ct,cb in CAS:
    im = ouvrir(f)
    # colonne juste a droite du rail or : x 45..70
    r = liseres(im, range(46,72), ct, cb, dl=3.0)
    h = cb-ct
    print(f"  {nom} cadre {ct}..{cb} (h={h})")
    for y,v,d in r:
        print(f"      y={y:5d} rel={y-ct:5d} {100*(y-ct)/h:6.2f}%  L={v} pic=+{d}")
