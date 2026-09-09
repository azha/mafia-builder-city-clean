# m14 — profil radial du medaillon depuis le centre AJUSTE (m13). r exprime en CSS (rayon absolu).
from lib import *
import math, json
C=json.load(open('centres.json'))
def bilin(im,x,y):
    x0,y0=int(math.floor(x)),int(math.floor(y)); fx,fy=x-x0,y-y0
    g=im.getpixel
    p00,p10,p01,p11=g((x0,y0)),g((x0+1,y0)),g((x0,y0+1)),g((x0+1,y0+1))
    return tuple(p00[k]*(1-fx)*(1-fy)+p10[k]*fx*(1-fy)+p01[k]*(1-fx)*fy+p11[k]*fx*fy for k in range(3))
SKIP=[(0,12),(348,360),(168,192),(60,120)]   # filet + bas (losange/texte)
def prof(im,cx,cy,s,rmaxCSS=40):
    out=[]
    k=0
    while k*0.05<rmaxCSS:
        rCSS=k*0.05; rr=rCSS*s
        L=[];G=[]
        for i in range(180):
            th=2*math.pi*i/180; deg=math.degrees(th)%360
            if any(a<=deg<=b for a,b in SKIP): continue
            x=cx+rr*math.cos(th); y=cy+rr*math.sin(th)
            if 1<=x<im.size[0]-2 and 1<=y<im.size[1]-2:
                c=bilin(im,x,y); L.append(lum(c)); G.append(c[0]-c[2])
        if L: out.append((rCSS,sum(L)/len(L),sum(G)/len(G)))
        k+=1
    return out
r=load(REF); d=load(DIS24)
pr=prof(r,C['ref'][0],C['ref'][1],S_REF)
pg=prof(d,C['dis24'][0],C['dis24'][1],S_CAP)
print("  rayon CSS |  REF L   REF(R-B) |  JEU L   JEU(R-B)")
dr={a:(b,c) for a,b,c in pr}; dg={a:(b,c) for a,b,c in pg}
for k in range(0,int(40/0.25)):
    rc=round(k*0.25,2)
    a=dr.get(rc); b=dg.get(rc)
    if a and b and rc>=18:
        print(f"   {rc:6.2f}   {a[0]:7.1f} {a[1]:8.1f}  | {b[0]:7.1f} {b[1]:8.1f}")
