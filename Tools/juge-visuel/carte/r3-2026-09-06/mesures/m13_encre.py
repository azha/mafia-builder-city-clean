# m13 - luminance et couleur de l'encre des noms, par nom, des deux cotes.
# Sert a choisir le seuil de m14 : on verifie que le pic d'encre est franchement au-dessus
# du seuil des DEUX cotes (sinon un seuil fixe biaiserait le masque du cote le plus sombre).
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'cap',cap.size)
def win(nom,xs,ys,src):
    rx,ry=svg2ref(xs,ys); hw=len(nom)*11+34
    dy=abs(math.sin(math.radians(src)))*hw
    return rx-hw, ry-26-dy-10, rx+hw, ry+dy+12
def top(px,W,H,box,mapper,k=140):
    x0,y0,x1,y1=box
    vals=[]
    for y in range(max(0,int(y0)),min(H,int(y1))):
        for x in range(max(0,int(x0)),min(W,int(x1))):
            p=px[x,y]; d=p[0]-p[2]
            if p[0]>=p[1]>=p[2] and 5<=d<=90: vals.append((L(p),p))
    vals.sort(reverse=True)
    sel=vals[:k]
    if not sel: return None
    lum=[v[0] for v in sel]
    rr=statistics.median([v[1][0] for v in sel]); gg=statistics.median([v[1][1] for v in sel]); bb=statistics.median([v[1][2] for v in sel])
    return statistics.median(lum), (rr,gg,bb), lum[0], lum[-1]
print(f"{'nom':20s} | {'REF  Lmed(pic)':>16s} {'rgb':>16s} | {'CAP  Lmed(pic)':>16s} {'rgb':>16s}")
for nom,xs,ys,src in NOMS:
    b=win(nom,xs,ys,src)
    a=top(R,1080,2102,b,None)
    cb=(*r2c(b[0],b[1]),*r2c(b[2],b[3]))
    d=top(C,1080,2400,cb,None)
    fa='%6.1f (%5.1f..%5.1f) %s'%(a[0],a[3],a[2],a[1]) if a else 'n/a'
    fd='%6.1f (%5.1f..%5.1f) %s'%(d[0],d[3],d[2],d[1]) if d else 'n/a'
    print(f'{nom:20s} | {fa:38s} | {fd}')
