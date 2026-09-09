# m12 — profil RADIAL moyen du medaillon (goldness R-B et luminance), 24 rayons
# Convention de bord DECLAREE : NOMINALE = mi-amplitude de la rampe ; COEUR = >=90% du pic.
from lib import *
import math

def bilin(im,x,y):
    x0,y0=int(math.floor(x)),int(math.floor(y)); fx,fy=x-x0,y-y0
    def g(a,b): return im.getpixel((a,b))
    p00,p10,p01,p11=g(x0,y0),g(x0+1,y0),g(x0,y0+1),g(x0+1,y0+1)
    return tuple(p00[k]*(1-fx)*(1-fy)+p10[k]*fx*(1-fy)+p01[k]*(1-fx)*fy+p11[k]*fx*fy for k in range(3))

def centre(im,cx,cy,rmax):
    """affine le centre par les 4 extremes de l'anneau dore"""
    for _ in range(4):
        def edge(dx,dy):
            best=None
            for t in [i*0.25 for i in range(int(rmax*0.6*4),int(rmax*1.4*4))]:
                c=bilin(im,cx+dx*t,cy+dy*t); g=c[0]-c[2]
                if best is None or g>best[1]: best=(t,g)
            return best[0]
        l=edge(-1,0); r=edge(1,0); u=edge(0,-1); d=edge(0,1)
        cx+= (r-l)/2*1.0 if False else (r-l)/2
        cy+= (d-u)/2
        R=(l+r+u+d)/4
    return cx,cy,R

def radial(im,cx,cy,rmax,skip_angles,n=48):
    """profil moyen : pour chaque rayon normalise, moyenne sur n directions (hors zones exclues)"""
    prof=[]
    for k in range(0,int(rmax*1.30*4)):
        rr=k/4.0
        acc=[];accg=[]
        for i in range(n):
            th=2*math.pi*i/n
            deg=(math.degrees(th))%360
            if any(a<=deg<=b for a,b in skip_angles): continue
            x=cx+rr*math.cos(th); y=cy+rr*math.sin(th)
            if 1<=x<im.size[0]-2 and 1<=y<im.size[1]-2:
                c=bilin(im,x,y); acc.append(lum(c)); accg.append(c[0]-c[2])
        if acc: prof.append((rr,sum(acc)/len(acc),sum(accg)/len(accg),len(acc)))
    return prof

print("== m12 profil radial du medaillon ==")
r=load(REF)
cx,cy,R=centre(r,588,117,96)
print(f"  REF  centre affine ({cx:.2f};{cy:.2f}) px = ({cx/S_REF:.2f};{cy/S_REF:.2f}) CSS  R(pic dore)={R:.2f} px = {R/S_REF:.2f} CSS")
d=load(DIS24)
gx,gy,GR=centre(d,540,111,90)
print(f"  JEU  centre affine ({gx:.2f};{gy:.2f}) px = ({gx/S_CAP:.2f};{gy/S_CAP:.2f}) CSS  R(pic dore)={GR:.2f} px = {GR/S_CAP:.2f} CSS")

# exclure : le filet horizontal (angles 0 et 180 +-8 deg), et le bas (texte/losange) 60..120 deg
SKIP=[(0,10),(350,360),(170,190),(60,120)]
pr=radial(r,cx,cy,R,SKIP); pg=radial(d,gx,gy,GR,SKIP)
print("\n  r/R      REF L    REF R-B  |  JEU L    JEU R-B")
i=0
for k in range(0,int(1.25*4*max(R,GR))):
    pass
def at(prof,Rn,frac):
    tgt=frac*Rn
    best=min(prof,key=lambda t:abs(t[0]-tgt)); return best
for frac in [i/100 for i in range(30,126,2)]:
    a=at(pr,R,frac); b=at(pg,GR,frac)
    print(f"  {frac:5.2f}  {a[1]:8.1f} {a[2]:8.1f}  |  {b[1]:8.1f} {b[2]:8.1f}")
