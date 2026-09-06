# m34 — CONTRASTE WCAG de l'anneau du bouton retour contre son entourage immediat, et du chevron.
# Controle positif : le contraste du sous-titre (mesure en m12) est >= 7,6:1 des deux cotes.
from PIL import Image
import os, math
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0; FR=2.0
def PX(v,o,f): return int(round(o+v*f))
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def lin(u):
    u/=255.0
    return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
def L(p): return .2126*lin(p[0])+.7152*lin(p[1])+.0722*lin(p[2])
def K(a,b):
    x,y=L(a),L(b)
    if x<y: x,y=y,x
    return (x+.05)/(y+.05)
def pic(px,ox,oy,f,cx,cy,R):
    X=PX(cx,ox,f);Y=PX(cy,oy,f);best=[]
    for k in range(16):
        a=k*math.pi/8.
        b=None
        for t in range(-8,9):
            rr=(R+t*0.25)*f
            x=int(round(X+rr*math.cos(a)));y=int(round(Y+rr*math.sin(a)))
            p=px[x,y]
            if b is None or lum(p)>lum(b): b=p
        best.append(b)
    best.sort(key=lum); return best[len(best)//2]
def med(px,ox,oy,f,x0,y0,x1,y1):
    v=[]
    for y in range(PX(y0,oy,f),PX(y1,oy,f)+1):
        for x in range(PX(x0,ox,f),PX(x1,ox,f)+1): v.append(px[x,y])
    return tuple(sorted(k[i] for k in v)[len(v)//2] for i in range(3))
for lab,(px,ox,oy,f,cx,cy) in {"REFERENCE":(r,0,0,FR,53.75,60.75),"JEU":(c,CX0,CY0,FC,53.98,60.90)}.items():
    an=pic(px,ox,oy,f,cx,cy,28.0)
    ext=med(px,ox,oy,f,cx-40,cy-6,cx-34,cy+6)     # juste a l'exterieur de l'anneau
    inte=med(px,ox,oy,f,cx-8,cy-16,cx+8,cy-9)      # interieur du bouton, hors chevron
    chev=None
    # chevron : pixel le plus clair au centre
    best=None
    for y in range(PX(cy-9,oy,f),PX(cy+9,oy,f)):
        for x in range(PX(cx-8,ox,f),PX(cx+8,ox,f)):
            p=px[x,y]
            if best is None or lum(p)>lum(best): best=p
    chev=best
    print("  %-10s anneau %s  exterieur %s  interieur %s  chevron %s"%(lab,an,ext,inte,chev))
    print("             contraste anneau/exterieur %.2f:1   anneau/interieur %.2f:1   chevron/interieur %.2f:1"%(
        K(an,ext),K(an,inte),K(chev,inte)))
