# m03 — centre et rayon du cerclage par AJUSTEMENT (pas centroide) + controle positif sur le canon
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m03 centre + rayon du cerclage (ajustement) ===')

def ring_pts(px, W, H, box, cible, tol):
    x0,y0,x1,y1 = box
    pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if dist_rgb(px[x,y], cible) <= tol: pts.append((x,y))
    return pts

def fit_cercle(pts):
    # Kasa : minimise sum (x^2+y^2 + D x + E y + F)^2 -> systeme 3x3
    n=len(pts)
    sx=sy=sxx=syy=sxy=sz=szx=szy=0.0
    for x,y in pts:
        z=x*x+y*y
        sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; szx+=z*x; szy+=z*y
    A=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,float(n)]]
    b=[-szx,-szy,-sz]
    # Gauss
    for i in range(3):
        p=max(range(i,3), key=lambda k: abs(A[k][i])); A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
        for k in range(i+1,3):
            f=A[k][i]/A[i][i]
            for j in range(i,3): A[k][j]-=f*A[i][j]
            b[k]-=f*b[i]
    s=[0,0,0]
    for i in (2,1,0):
        s[i]=(b[i]-sum(A[i][j]*s[j] for j in range(i+1,3)))/A[i][i]
    D,E,F=s
    cx=-D/2; cy=-E/2; r=math.sqrt(max(0.0,cx*cx+cy*cy-F))
    res=[abs(math.hypot(x-cx,y-cy)-r) for x,y in pts]
    return cx,cy,r,med(res)

def robuste(pts, tours=4):
    cx,cy,r,mr = fit_cercle(pts)
    for _ in range(tours):
        pts=[p for p in pts if abs(math.hypot(p[0]-cx,p[1]-cy)-r) <= max(2.0, 3*mr)]
        cx,cy,r,mr = fit_cercle(pts)
    return cx,cy,r,mr,len(pts)

for path,nom,sc,box,cible,tol in [
    (CANON,'canon (laiton)',SC_CANON,(492,10,690,215),TOK['laiton'],30),
    (DIST,'district2400 (braise)',SC_CAPT,(430,0,650,215),TOK['braise'],34),
    (F1920,'fiche1920 (braise)',SC_CAPT,(430,0,650,215),TOK['braise'],34),
    (F2400,'fiche2400 (braise)',SC_CAPT,(430,0,650,215),TOK['braise'],34),
]:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    pts=ring_pts(px,W,H,box,cible,tol)
    cx,cy,r,mr,n = robuste(pts)
    print('   %-24s pts=%5d -> centre (%.2f, %.2f) px = (%.2f, %.2f) CSS ; R=%.2f px = %.2f CSS ; D=%.2f CSS ; residu med %.2f px'
          % (nom,n,cx,cy,cx/sc,cy/sc,r,r/sc,2*r/sc,mr))
