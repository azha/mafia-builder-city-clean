# -- m06 : ajustement du CERCLE du cerclage (centre + rayon) par recherche du pic de couleur sur 144 rayons,
#          puis moindres carres. Controle positif : le canon doit rendre R = 32,0 +- 0,3 CSS (.medaillon 64).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s
    x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def fit(key, target, c0, fy, r0=26.0, r1=38.0, tol=60):
    s=sc(key); im=img(key)
    cx,cy=c0
    for it in range(6):
        pts=[]
        for i in range(144):
            th=2*math.pi*i/144
            best=None; r=r0
            while r<=r1:
                x=cx+r*math.cos(th); y=cy-r*math.sin(th)
                if not (fy[0]<=y<=fy[1]):
                    p=bil(im,s,x,y)
                    d2=sum((p[c]-target[c])**2 for c in range(3))
                    if best is None or d2<best[1]: best=(r,d2,x,y)
                r+=0.02
            if best and best[1]<tol*tol*3: pts.append((th,best[0]))
        # moindres carres lineaires : x^2+y^2 + D x + E y + F = 0
        Sxx=Sxy=Syy=Sx=Sy=Sz=Sxz=Syz=0.0; n=0
        for th,r in pts:
            x=cx+r*math.cos(th); y=cy-r*math.sin(th); z=x*x+y*y
            Sxx+=x*x;Sxy+=x*y;Syy+=y*y;Sx+=x;Sy+=y;Sz+=z;Sxz+=x*z;Syz+=y*z;n+=1
        A=[[Sxx,Sxy,Sx],[Sxy,Syy,Sy],[Sx,Sy,float(n)]]; B=[-Sxz,-Syz,-Sz]
        # Gauss
        M=[A[i][:]+[B[i]] for i in range(3)]
        for i in range(3):
            p=max(range(i,3),key=lambda k:abs(M[k][i])); M[i],M[p]=M[p],M[i]
            for k in range(i+1,3):
                f=M[k][i]/M[i][i]
                for j in range(i,4): M[k][j]-=f*M[i][j]
        sol=[0,0,0]
        for i in (2,1,0):
            sol[i]=(M[i][3]-sum(M[i][j]*sol[j] for j in range(i+1,3)))/M[i][i]
        D,E,F=sol
        ncx=-D/2; ncy=-E/2; R=math.sqrt(max(ncx*ncx+ncy*ncy-F,0))
        cx,cy=ncx,ncy
    rs=[]
    for th,r in pts:
        x=cx+r*math.cos(th); y=cy-r*math.sin(th)
        rs.append(math.hypot(x-cx,y-cy))
    rs.sort()
    return dict(cx=cx,cy=cy,R=R,n=len(pts),rmin=rs[0],rmax=rs[-1],rmed=rs[len(rs)//2])

print("=== CONTROLE POSITIF : canon, cerclage LAITON, R attendu 32,0 (.medaillon 64 CSS) ===")
r=fit('ref',(176,141,62),(195.8,40.0),(50.6,52.2))
print("  canon : centre (%.3f , %.3f)  R=%.3f CSS  ⇒ diametre %.2f  (n=%d rayons, r med %.2f, min %.2f, max %.2f)"
      %(r['cx'],r['cy'],r['R'],2*r['R'],r['n'],r['rmed'],r['rmin'],r['rmax']))
REF=r
print()
for k in ['c19','c24']:
    r=fit(k,(224,102,74),(195.8,39.9),(50.8,52.0))
    print("  %s   : centre (%.3f , %.3f)  R=%.3f CSS  ⇒ diametre %.2f  (n=%d, med %.2f, min %.2f, max %.2f)  Δdiam=%+.2f CSS (%+.1f %%)"
          %(k,r['cx'],r['cy'],r['R'],2*r['R'],r['n'],r['rmed'],r['rmin'],r['rmax'],2*(r['R']-REF['R']),100*(r['R']/REF['R']-1)))
