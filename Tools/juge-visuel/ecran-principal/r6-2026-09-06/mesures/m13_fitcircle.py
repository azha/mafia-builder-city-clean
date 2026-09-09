# m13 — ajustement du cercle du boitier par moindres carres sur le PIC de dore de 72 rayons
# (angles exclus : filet horizontal +-10 deg, bas +-30 deg autour de 90 deg pour le losange)
from lib import *
import math
def bilin(im,x,y):
    x0,y0=int(math.floor(x)),int(math.floor(y)); fx,fy=x-x0,y-y0
    g=im.getpixel
    p00,p10,p01,p11=g((x0,y0)),g((x0+1,y0)),g((x0,y0+1)),g((x0+1,y0+1))
    return tuple(p00[k]*(1-fx)*(1-fy)+p10[k]*fx*(1-fy)+p01[k]*(1-fx)*fy+p11[k]*fx*fy for k in range(3))

def peak_ray(im,cx,cy,th,r0,r1):
    best=None
    t=r0
    while t<r1:
        c=bilin(im,cx+t*math.cos(th),cy+t*math.sin(th)); g=c[0]-c[2]
        if best is None or g>best[1]: best=(t,g)
        t+=0.2
    return best

def fit(im,cx,cy,R,label,skip):
    for it in range(6):
        pts=[]
        for i in range(144):
            th=2*math.pi*i/144; deg=math.degrees(th)%360
            if any(a<=deg<=b for a,b in skip): continue
            t,g=peak_ray(im,cx,cy,th,R*0.80,R*1.20)
            if g>30: pts.append((cx+t*math.cos(th),cy+t*math.sin(th)))
        # moindres carres algebrique
        Sx=sum(p[0] for p in pts); Sy=sum(p[1] for p in pts); n=len(pts)
        Sxx=sum(p[0]**2 for p in pts); Syy=sum(p[1]**2 for p in pts); Sxy=sum(p[0]*p[1] for p in pts)
        Sxz=sum(p[0]*(p[0]**2+p[1]**2) for p in pts); Syz=sum(p[1]*(p[0]**2+p[1]**2) for p in pts)
        Sz=sum(p[0]**2+p[1]**2 for p in pts)
        A=[[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,n]]; B=[Sxz,Syz,Sz]
        # Gauss
        M=[row[:]+[B[i]] for i,row in enumerate(A)]
        for i in range(3):
            p=max(range(i,3),key=lambda k:abs(M[k][i])); M[i],M[p]=M[p],M[i]
            for k in range(i+1,3):
                f=M[k][i]/M[i][i]
                for j in range(i,4): M[k][j]-=f*M[i][j]
        sol=[0,0,0]
        for i in (2,1,0):
            sol[i]=(M[i][3]-sum(M[i][j]*sol[j] for j in range(i+1,3)))/M[i][i]
        a,b,c=sol; ncx=a/2; ncy=b/2; nR=math.sqrt(c+ncx**2+ncy**2)
        cx,cy,R=ncx,ncy,nR
    resid=[abs(math.hypot(p[0]-cx,p[1]-cy)-R) for p in pts]
    print(f"    {label}: centre ({cx:.2f};{cy:.2f}) px  R(pic)={R:.2f} px  n={len(pts)}  residu median={median(resid):.2f} px")
    return cx,cy,R

print("== m13 ajustement du boitier ==")
SKIP=[(0,12),(348,360),(168,192),(70,110)]
r=load(REF);  rc=fit(r,588,117,95,'REFERENCE',SKIP)
print(f"      -> CSS centre ({rc[0]/S_REF:.2f};{rc[1]/S_REF:.2f})  R={rc[2]/S_REF:.2f} CSS")
d=load(DIS24); dc=fit(d,540,111,88,'JEU district 2400',SKIP)
print(f"      -> CSS centre ({dc[0]/S_CAP:.2f};{dc[1]/S_CAP:.2f})  R={dc[2]/S_CAP:.2f} CSS")
c=load(CAP19); cc=fit(c,540,111,88,'JEU fiche 1920',SKIP)
print(f"      -> CSS centre ({cc[0]/S_CAP:.2f};{cc[1]/S_CAP:.2f})  R={cc[2]/S_CAP:.2f} CSS")
import json
json.dump({'ref':rc,'dis24':dc,'cap19':cc},open('centres.json','w'))
