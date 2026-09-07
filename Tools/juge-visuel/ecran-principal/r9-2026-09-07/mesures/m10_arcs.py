# m10 — arcs du cadran : centre de courbure, rayon, etendue angulaire, epaisseur radiale (mi-hauteur)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m10 arcs du cadran : rayon, etendue, epaisseur ===')

def fit_cercle(pts):
    n=len(pts); sx=sy=sxx=syy=sxy=sz=szx=szy=0.0
    for x,y in pts:
        z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; szx+=z*x; szy+=z*y
    A=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,float(n)]]; b=[-szx,-szy,-sz]
    for i in range(3):
        p=max(range(i,3), key=lambda k: abs(A[k][i])); A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
        for k in range(i+1,3):
            f=A[k][i]/A[i][i]
            for j in range(i,3): A[k][j]-=f*A[i][j]
            b[k]-=f*b[i]
    s=[0,0,0]
    for i in (2,1,0): s[i]=(b[i]-sum(A[i][j]*s[j] for j in range(i+1,3)))/A[i][i]
    D,E,F=s; cx=-D/2; cy=-E/2; r=math.sqrt(max(0,cx*cx+cy*cy-F))
    return cx,cy,r

def teal(c):
    r,g,b=c; return b>r+18 and g>r+10 and b>60 and g>60
def brais(c):
    r,g,b=c; return r-b>40 and r-g>35 and r>90

CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60),
     (F1920,'fiche1920',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]

for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load()
    print('   --- %s ---' % nom)
    for lab,pred in (('teal',teal),('braise',brais)):
        pts=[]
        for y in range(int(mcy-mR), int(mcy+mR)):
            for x in range(int(mcx-mR), int(mcx+mR)):
                if math.hypot(x-mcx,y-mcy) > mR-6: continue     # exclut le cerclage
                if y > pvy+2: continue                          # exclut le texte sous le pivot
                if math.hypot(x-pvx,y-pvy) < 6: continue         # exclut le pivot
                if pred(px[x,y]): pts.append((x,y))
        if len(pts)<40: print('      %-7s : %d px -> trop peu' % (lab,len(pts))); continue
        cx,cy,R = fit_cercle(pts)
        # angles (convention : 0 = +x, sens trigo avec y vers le bas -> on prend atan2(-(y-cy), x-cx))
        angs=sorted(math.degrees(math.atan2(-(p[1]-cy), p[0]-cx)) for p in pts)
        a0,a1=angs[0],angs[-1]
        # epaisseur : profil radial a 25 angles repartis
        eps=[]
        W,H=im.size
        for k in range(25):
            a=math.radians(a0 + (a1-a0)*(k+0.5)/25.0)
            vals=[]
            rr=R-14
            prof=[]
            while rr<=R+14:
                xi=cx+rr*math.cos(a); yi=cy-rr*math.sin(a)
                x0,y0=int(xi),int(yi); fx,fy=xi-x0,yi-y0
                if not(0<=x0<W-1 and 0<=y0<H-1): rr+=0.1; continue
                def g(xx,yy): 
                    c=px[xx,yy]
                    return abs(c[2]-c[0]) if lab=='teal' else (c[0]-c[2])
                v=(g(x0,y0)*(1-fx)*(1-fy)+g(x0+1,y0)*fx*(1-fy)+g(x0,y0+1)*(1-fx)*fy+g(x0+1,y0+1)*fx*fy)
                prof.append((rr,v)); rr+=0.1
            if not prof: continue
            vmax=max(v for _,v in prof); vmin=min(v for _,v in prof)
            if vmax-vmin < 12: continue
            seuil=(vmax+vmin)/2.0
            rs=[r for r,v in prof if v>=seuil]
            if rs: eps.append(max(rs)-min(rs))
        print('      %-7s : %5d px ; centre (%.2f,%.2f) CSS ; R=%.2f CSS ; angles %.1f deg .. %.1f deg (etendue %.1f deg) ; epaisseur mediane %.2f CSS (n=%d)'
              % (lab,len(pts),cx/sc,cy/sc,R/sc,a0,a1,a1-a0, (med(eps)/sc if eps else -1), len(eps)))
        print('           centre par rapport au PIVOT : dx=%+.2f dy=%+.2f CSS' % ((cx-pvx)/sc,(cy-pvy)/sc))
