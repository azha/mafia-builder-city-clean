# -- m05 : profil RADIAL du medaillon (mediane sur 144 rayons) : cerclage, lunette, fond.
#    Convention de bord : NOMINAL = largeur a mi-hauteur du pic (mi-alpha) ; COEUR = largeur a >=95 % du pic.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

CENTRES = {'ref':(195.83,40.00), 'c19':(195.82,39.85), 'c24':(195.82,39.85), 'd24':(195.82,39.85)}
FILETY  = {'ref':(50.6,52.2), 'c19':(50.8,52.0), 'c24':(50.8,52.0), 'd24':(50.8,52.0)}

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s
    x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def profil(key, r0=18.0, r1=40.0, step=0.05, nray=288):
    s=sc(key); im=img(key); cx,cy=CENTRES[key]; fy0,fy1=FILETY[key]
    rr=[]; r=r0
    while r<=r1+1e-9:
        vals=[]
        for i in range(nray):
            th=2*math.pi*i/nray
            x=cx+r*math.cos(th); y=cy-r*math.sin(th)
            if fy0<=y<=fy1: continue          # filet exclu
            vals.append(lum(bil(im,s,x,y)))
        vals.sort(); rr.append((r, vals[len(vals)//2], len(vals)))
        r+=step
    return rr

def pic(rr, rmin, rmax):
    seg=[p for p in rr if rmin<=p[0]<=rmax]
    best=max(seg,key=lambda p:p[1]); base=min(p[1] for p in rr if 18<=p[0]<=24)
    half=(best[1]+base)/2; q95=base+0.95*(best[1]-base)
    def width(thr):
        # largeur contigue autour du pic au-dessus de thr
        i=[j for j,p in enumerate(rr) if p[0]==best[0]][0]
        a=i
        while a>0 and rr[a-1][1]>=thr: a-=1
        b=i
        while b<len(rr)-1 and rr[b+1][1]>=thr: b+=1
        return rr[a][0], rr[b][0], rr[b][0]-rr[a][0]+0.05
    ha,hb,hw=width(half); ca,cb,cw=width(q95)
    return dict(rpic=best[0], Lpic=best[1], Lbase=base, nom_r=(ha,hb), nominal=hw, coeur=cw)

for key in ['ref','c19','c24']:
    print("=== %s ==="%key)
    rr=profil(key)
    print("  centre CSS", CENTRES[key], " rayons utiles a r=32 :", [p[2] for p in rr if abs(p[0]-32)<0.03])
    # impression compacte
    line=[]
    for r,L,n in rr:
        if abs(r*20-round(r*20))<1e-6 and abs((r*4)-round(r*4))<1e-6:
            line.append("%.2f:%.0f"%(r,L))
    print("  L(r) tous les 0,25 CSS :", " ".join(line))
    p=pic(rr,26,38)
    print("  CERCLAGE : pic a r=%.2f CSS  L=%.1f (base %.1f) | NOMINAL(mi-hauteur)=%.2f CSS sur %.2f..%.2f | COEUR(95%%)=%.2f"
          %(p['rpic'],p['Lpic'],p['Lbase'],p['nominal'],p['nom_r'][0],p['nom_r'][1],p['coeur']))
    print("  ⇒ diametre NOMINAL exterieur = 2*(%.2f) = %.2f CSS ; centre du trait 2*%.2f = %.2f"
          %(p['nom_r'][1], 2*p['nom_r'][1], p['rpic'], 2*p['rpic']))
    print()
