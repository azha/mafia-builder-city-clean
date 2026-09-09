# -- m08 : centre + rayon du CERCLAGE, recherche restreinte a la bande exterieure (exclut la lunette).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
exec(open(D+'mesures/_fitlib.py').read()) if False else None

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s
    x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def fit(key,c0,fy,r0,r1):
    """centre par pic de LUMINANCE sur chaque rayon dans [r0,r1] (le cerclage est la structure la plus claire)"""
    s=sc(key); im=img(key); cx,cy=c0
    for it in range(8):
        pts=[]
        for i in range(288):
            th=2*math.pi*i/288
            best=None; r=r0
            while r<=r1:
                x=cx+r*math.cos(th); y=cy-r*math.sin(th)
                if not (fy[0]<=y<=fy[1]):
                    L=lum(bil(im,s,x,y))
                    if best is None or L>best[1]: best=(r,L)
                r+=0.02
            if best and best[1]>60: pts.append((th,best[0]))
        Sxx=Sxy=Syy=Sx=Sy=Sz=Sxz=Syz=0.0; n=0
        for th,r in pts:
            x=cx+r*math.cos(th); y=cy-r*math.sin(th); z=x*x+y*y
            Sxx+=x*x;Sxy+=x*y;Syy+=y*y;Sx+=x;Sy+=y;Sz+=z;Sxz+=x*z;Syz+=y*z;n+=1
        M=[[Sxx,Sxy,Sx,-Sxz],[Sxy,Syy,Sy,-Syz],[Sx,Sy,float(n),-Sz]]
        for i in range(3):
            p=max(range(i,3),key=lambda k:abs(M[k][i])); M[i],M[p]=M[p],M[i]
            for k in range(i+1,3):
                f=M[k][i]/M[i][i]
                for j in range(i,4): M[k][j]-=f*M[i][j]
        sol=[0,0,0]
        for i in (2,1,0):
            sol[i]=(M[i][3]-sum(M[i][j]*sol[j] for j in range(i+1,3)))/M[i][i]
        D_,E_,F_=sol
        cx=-D_/2; cy=-E_/2; R=math.sqrt(max(cx*cx+cy*cy-F_,0))
    rs=sorted(r for _,r in pts)
    return cx,cy,R,len(pts),rs[len(rs)//2],rs[0],rs[-1]

print("=== CONTROLE POSITIF : canon, bande 30,0..33,5 (cerclage seul) — R attendu ~31,3 (medaillon 64 exterieur) ===")
cx,cy,R,n,rm,r0_,r1_=fit('ref',(195.9,39.0),(50.6,52.2),30.0,33.5)
print("  canon  centre (%.3f , %.3f)  R(pic)=%.3f  n=%d  r med %.2f  [%.2f..%.2f]"%(cx,cy,R,n,rm,r0_,r1_))
REF=(cx,cy,R)
for k in ['c19','c24','d24']:
    a,b,c,n,rm,x0,x1=fit(k,(195.8,39.8),(50.8,52.0),30.0,36.0)
    print("  %-4s   centre (%.3f , %.3f)  R(pic)=%.3f  n=%d  r med %.2f  [%.2f..%.2f]   Δ centre y = %+.2f CSS ; ΔR = %+.2f (%+.1f %%)"
          %(k,a,b,c,n,rm,x0,x1,b-REF[1],c-REF[2],100*(c/REF[2]-1)))
