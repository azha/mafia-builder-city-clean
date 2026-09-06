# m10 — medaillon : centre, rayon du boitier, profil radial du cerclage, lunette
# Convention de bord DECLAREE : NOMINALE = bords a MI-AMPLITUDE de la rampe (mi-alpha),
#   le "coeur" (plateau >=90% du pic) est donne a part.
from lib import *
import math

def goldmask(im,x0,y0,x1,y1):
    """pixels dores/orange : R-B > 25 et R > 60"""
    pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=im.getpixel((x,y))
            if r-b>25 and r>60: pts.append((x,y,r,g,b))
    return pts

def fit_circle(pts):
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    # centre par bbox du masque (l'anneau est symetrique)
    cx=(min(xs)+max(xs))/2.0; cy=(min(ys)+max(ys))/2.0
    R=((max(xs)-min(xs))+(max(ys)-min(ys)))/4.0
    return cx,cy,R,min(xs),max(xs),min(ys),max(ys)

print("== m10 medaillon ==")
for p,nm,box,s in [(REF,'REFERENCE',(480,10,700,230),S_REF),
                   (DIS24,'JEU district 2400',(430,0,650,250),S_CAP),
                   (CAP19,'JEU fiche 1920',(430,0,650,250),S_CAP)]:
    im=load(p)
    pts=goldmask(im,*box)
    # ne garder que l'anneau : eliminer les pixels proches du centre approx
    cx,cy,R,xa,xb,ya,yb=fit_circle(pts)
    print(f"  {nm}: masque dore n={len(pts)}  bbox x {xa}..{xb} y {ya}..{yb}")
    print(f"     centre px ({cx:.1f};{cy:.1f}) = CSS ({cx/s:.2f};{cy/s:.2f})   R(bbox/2) = {R:.1f} px = {R/s:.2f} CSS")
