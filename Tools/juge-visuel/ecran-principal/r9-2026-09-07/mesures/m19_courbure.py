# m19 — rayon de COURBURE des arcs : ajustement sur la LIGNE MOYENNE (crete par angle), pas sur la bande.
# Controle positif : arc synthetique fin ; et la source du canon donne teal centre (34,0 ; 33,7) vb et
# braise (26,2 ; 30,8) vb, R=26 vb  (derives des chemins SVG M8 34 A26 26 0 0 1 30 8 / M43 11 A26 26 0 0 1 52 34).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m19 rayon de courbure (ligne moyenne) ===')
def fit(pts):
    n=len(pts); sx=sy=sxx=syy=sxy=sz=szx=szy=0.0
    for x,y in pts:
        z=x*x+y*y; sx+=x; sy+=y; sxx+=x*x; syy+=y*y; sxy+=x*y; sz+=z; szx+=z*x; szy+=z*y
    A=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,float(n)]]; b=[-szx,-szy,-sz]
    for i in range(3):
        p=max(range(i,3),key=lambda k:abs(A[k][i])); A[i],A[p]=A[p],A[i]; b[i],b[p]=b[p],b[i]
        for k in range(i+1,3):
            f=A[k][i]/A[i][i]
            for j in range(i,3): A[k][j]-=f*A[i][j]
            b[k]-=f*b[i]
    s=[0,0,0]
    for i in (2,1,0): s[i]=(b[i]-sum(A[i][j]*s[j] for j in range(i+1,3)))/A[i][i]
    D,E,F=s; cx=-D/2; cy=-E/2
    return cx,cy,math.sqrt(max(0,cx*cx+cy*cy-F))
# controle : ligne moyenne synthetique R=57 centre (300,200), 90 deg
syn=[(300+57*math.cos(math.radians(90+90*k/200.0)), 200-57*math.sin(math.radians(90+90*k/200.0))) for k in range(200)]
c=fit(syn); print('   CONTROLE (fin) : attendu (300,200) R=57 -> (%.3f,%.3f) R=%.3f'%c)

def s_teal(c): return c[2]-c[0]
def s_brais(c): return c[0]-c[2]
CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    lim=0.82*mR
    def v(sig,x,y):
        xq,yq=int(x),int(y); fx,fy=x-xq,y-yq
        if not(0<=xq<W-1 and 0<=yq<H-1): return -999
        return (sig(px[xq,yq])*(1-fx)*(1-fy)+sig(px[xq+1,yq])*fx*(1-fy)
                +sig(px[xq,yq+1])*(1-fx)*fy+sig(px[xq+1,yq+1])*fx*fy)
    print('   --- %s ---'%nom)
    for lab,sig,seuil in (('teal',s_teal,30),('braise',s_brais,45)):
        ligne=[]
        for a in range(0,360):
            best=(-999,None)
            r=10.0*sc/2.0
            r=8.0
            while r<lim:
                if abs(math.hypot(pvx+r*math.cos(math.radians(a))-mcx, pvy-r*math.sin(math.radians(a))-mcy))<lim:
                    pass
                x=pvx+r*math.cos(math.radians(a)); y=pvy-r*math.sin(math.radians(a))
                if math.hypot(x-mcx,y-mcy)<lim and y<=pvy+2:
                    s=v(sig,x,y)
                    if s>best[0]: best=(s,r)
                r+=0.2
            if best[1] is not None and best[0]>=seuil:
                ligne.append((pvx+best[1]*math.cos(math.radians(a)), pvy-best[1]*math.sin(math.radians(a))))
        if len(ligne)<25: print('      %-7s : %d points'%(lab,len(ligne))); continue
        cx,cy,R=fit(ligne)
        for _ in range(3):
            q=[p for p in ligne if abs(math.hypot(p[0]-cx,p[1]-cy)-R)<max(1.5,0.06*R)]
            if len(q)<20: break
            ligne=q; cx,cy,R=fit(ligne)
        angs=sorted(math.degrees(math.atan2(-(p[1]-cy),p[0]-cx)) for p in ligne)
        # deroulement
        ref=med(angs); A2=sorted(((a-ref+180)%360)-180+ref for a in angs)
        print('      %-7s : %3d pts de ligne moyenne ; R courbure = %.2f CSS ; centre a dx=%+.2f dy=%+.2f CSS du pivot ; etendue %.1f deg'
              % (lab,len(ligne),R/sc,(cx-pvx)/sc,(cy-pvy)/sc,A2[-1]-A2[0]))
