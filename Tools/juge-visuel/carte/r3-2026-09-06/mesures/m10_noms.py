# m10 - segmentation de l'encre des 18 noms, cote REFERENCE et cote CAPTURE.
# Filtre : L>150 ET 8 <= (R-B) <= 80 ET R>=G>=B  (encre creme des noms)
#   - exclut les lampes or (#f2c96b, R-B=135), les tours blanc-bleu (R-B<0),
#     le disque "VOUS ETES ICI" (#f2c96b), la route or (L~120).
# Controle POSITIF du filtre : "LE THRENNY" (peint DANS la texture, present des deux cotes).
# Controle NEGATIF du filtre : une fenetre de fleuve nu doit rendre ~0 px.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, json

ref=Image.open('../reference-1080x2102.png').convert('RGB')
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref',ref.size,' cap',cap.size)
R=ref.load(); C=cap.load()

def ink(p):
    if L(p)<=150: return False
    d=p[0]-p[2]
    return 8<=d<=80 and p[0]>=p[1]>=p[2]

def scan(px,W,H,x0,y0,x1,y1):
    pts=[]
    for y in range(max(0,int(y0)),min(H,int(y1))):
        for x in range(max(0,int(x0)),min(W,int(x1))):
            if ink(px[x,y]): pts.append((x,y))
    return pts

def stats(pts):
    if not pts: return None
    n=len(pts)
    sx=sum(p[0] for p in pts); sy=sum(p[1] for p in pts)
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return dict(n=n,cx=sx/n,cy=sy/n,x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys))

# controles du filtre
th_ref=scan(R,1080,2102,430,1110,660,1170)   # LE THRENNY cote ref
tx0,ty0=r2c(430,1110); tx1,ty1=r2c(660,1170)
th_cap=scan(C,1080,2400,tx0,ty0,tx1,ty1)
print('CONTROLE POSITIF  LE THRENNY : ref %d px, cap %d px'%(len(th_ref),len(th_cap)))
riv_ref=scan(R,1080,2102,300,1020,500,1080)
rx0,ry0=r2c(300,1020); rx1,ry1=r2c(500,1080)
riv_cap=scan(C,1080,2400,rx0,ry0,rx1,ry1)
print('CONTROLE NEGATIF  fleuve nu   : ref %d px, cap %d px'%(len(riv_ref),len(riv_cap)))

out={}
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys)
    nch=len(nom)
    hw=nch*11+34
    dy=abs(math.sin(math.radians(src)))*hw
    y0=ry-26-dy-10; y1=ry+dy+12
    x0=rx-hw; x1=rx+hw
    pr=stats(scan(R,1080,2102,x0,y0,x1,y1))
    cx0,cy0=r2c(x0,y0); cx1,cy1=r2c(x1,y1)
    pc=stats(scan(C,1080,2400,cx0,cy0,cx1,cy1))
    out[nom]=dict(win_ref=[x0,y0,x1,y1],ref=pr,cap=pc,src=src,anchor_ref=[rx,ry])
    def f(d):
        return 'n/a' if d is None else 'n=%4d c=(%7.1f,%7.1f) bbox=%4d..%4d x %4d..%4d'%(d['n'],d['cx'],d['cy'],d['x0'],d['x1'],d['y0'],d['y1'])
    print('%-18s REF %s'%(nom,f(pr)))
    print('%-18s CAP %s'%('',f(pc)))
json.dump(out,open('noms_brut.json','w'))
