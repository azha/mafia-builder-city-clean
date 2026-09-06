# -*- coding: utf-8 -*-
"""m11 - piste neutre, aiguille, pivot, eclairage du fond de cadran, lunette.
CONVENTIONS : angles 0 deg a droite, sens trigo, origine = PIVOT pour l'aiguille (c'est son axe) ;
bord NOMINAL = mi-alpha, CoEUR = >95 % du pic."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json')); CAD=json.load(open('cadran.json'))

def ech(im,f,x,y):
    px=im.load(); W,H=im.size
    X,Y=x*f,y*f; x0,y0=int(X),int(Y); dx,dy=X-x0,Y-y0
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return px[a,b]
    c00,c10,c01,c11=g(x0,y0),g(x0+1,y0),g(x0,y0+1),g(x0+1,y0+1)
    return tuple((1-dx)*(1-dy)*c00[k]+dx*(1-dy)*c10[k]+(1-dx)*dy*c01[k]+dx*dy*c11[k] for k in range(3))

print("=== m11 ===\n")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle)
    a=ANC[cle]; d=CAD[cle]; pvx,pvy=d['pvx'],d['pvy']; bcx,bcy=a['cx'],a['cy']
    print("-- %s   boitier (%.2f;%.2f)  pivot (%.2f;%.2f)"%(cle,bcx,bcy,pvx,pvy))

    # (1) PISTE NEUTRE : dans l'interstice, y a-t-il une bande plus CLAIRE que le fond du cadran ?
    #     on balaie le rayon sur la bissectrice de l'interstice, autour du centre du boitier.
    ang = {'canon':(48.5+88.5)/2, 'j1920':(57.5+91.5)/2, 'j2400':(58.0+91.5)/2}[cle]
    prof=[]
    for k in range(60,260):
        r=k*0.1
        c=ech(im,f, bcx+r*math.cos(math.radians(ang)), bcy-r*math.sin(math.radians(ang)))
        prof.append((r,L(c)))
    base=mediane([v for r,v in prof if 6<=r<=9])
    pic=max(v for r,v in prof if 10<=r<=22)
    rp=[r for r,v in prof if v==pic][0]
    print("   piste neutre : bissectrice %.1f deg ; L fond(r 6..9)=%.1f ; MAX(r 10..22)=%.1f a r=%.1f  => bosse %+.1f L"
          %(ang,base,pic,rp,pic-base))

    # (2) AIGUILLE : pixels clairs et neutres (creme) hors arcs, dans r 3..22 du pivot
    P=[]
    for yy in range(int((pvy-24)*f), int((pvy+6)*f)):
        for xx in range(int((pvx-24)*f), int((pvx+24)*f)):
            r=math.hypot(xx/f-pvx, yy/f-pvy)
            if not (3.0<=r<=24.0): continue
            c=im.load()[xx,yy]
            if min(c)>=150 and (max(c)-min(c))<=45: P.append((xx/f,yy/f,r))
    if P:
        rmax=max(p[2] for p in P)
        loin=[p for p in P if p[2]>rmax-1.5]
        ax=sum(p[0] for p in loin)/len(loin); ay=sum(p[1] for p in loin)/len(loin)
        angA=math.degrees(math.atan2(pvy-ay, ax-pvx))
        print("   aiguille : %d px ; pointe a r=%.2f CSS (%.3f R_boitier) ; angle %.1f deg (conv. pivot)"
              %(len(P),rmax,rmax/(a['r_nom_ext'] if 'r_nom_ext' in a else 32.0),angA))
    # (3) PIVOT : diametre mi-alpha sur (R-B), coupes h et v
    for axe in 'hv':
        vals=[]
        for k in range(-90,91):
            x = pvx+k*0.05 if axe=='h' else pvx
            y = pvy if axe=='h' else pvy+k*0.05
            c=ech(im,f,x,y); vals.append((k*0.05, c[0]-c[2]))
        pic=max(v for _,v in vals); fond=mediane([v for kk,v in vals if abs(kk)>3.5])
        mi=fond+(pic-fond)*0.5
        au=[kk for kk,v in vals if v>=mi]
        print("   pivot %s : diametre NOMINAL %.2f CSS (pic %d, fond %d)"%(axe,au[-1]-au[0],pic,fond))
    # (4) ECLAIRAGE DIRECTIONNEL du fond : mediane par secteur de 45 deg dans l'anneau 0.58..0.72 R
    Rb=a['r_nom_ext']
    sect={}
    for yy in range(int((bcy-Rb)*f), int((bcy+Rb)*f)):
        for xx in range(int((bcx-Rb)*f), int((bcx+Rb)*f)):
            X,Y=xx/f,yy/f; r=math.hypot(X-bcx,Y-bcy)
            if not (0.58*Rb<=r<=0.72*Rb): continue
            c=im.load()[xx,yy]
            if min(c)>110: continue                 # encre claire (texte, aiguille) exclue
            if abs(c[0]-c[2])>22: continue          # arcs exclus
            s=int((math.degrees(math.atan2(bcy-Y,X-bcx))%360)//45)
            sect.setdefault(s,[]).append(c)
    ms={s:tuple(mediane([c[k] for c in v]) for k in range(3)) for s,v in sect.items() if len(v)>25}
    if ms:
        amp=tuple(max(v[k] for v in ms.values())-min(v[k] for v in ms.values()) for k in range(3))
        Ls={s:L(v) for s,v in ms.items()}
        clair=max(Ls,key=lambda s:Ls[s])
        print("   fond du cadran : %d secteurs ; amplitude inter-secteurs RGB %s ; L %.1f ; secteur le plus clair %d..%d deg"
              %(len(ms),amp,max(Ls.values())-min(Ls.values()),clair*45,clair*45+45))
    # (5) LUNETTE : profil radial de L, median sur 720 rayons, r 0.70..1.00 R
    pr=[]
    for k in range(int(0.70*Rb*20), int(1.00*Rb*20)):
        r=k/20.0; vals=[]
        for j in range(720):
            th=2*math.pi*j/720
            c=ech(im,f,bcx+r*math.cos(th), bcy-r*math.sin(th))
            vals.append(L(c))
        pr.append((r/Rb, mediane(vals)))
    # maximum local entre 0.80 et 0.95 R
    zone=[(u,v) for u,v in pr if 0.78<=u<=0.96]
    mx=max(zone,key=lambda z:z[1])
    i=[k for k,z in enumerate(zone) if z is mx][0]
    gauche=min(v for u,v in zone[:max(1,i)]) if i>0 else mx[1]
    droite=min(v for u,v in zone[i+1:]) if i+1<len(zone) else mx[1]
    print("   lunette : max local L=%.1f a r=%.3f R ; creux gauche %.1f droite %.1f => saillie %+.1f L"
          %(mx[1],mx[0],gauche,droite,mx[1]-max(gauche,droite)))
    print("      profil L (u=r/R) : %s"%(" ".join("%.2f:%.0f"%(u,v) for u,v in pr if abs(u*50-round(u*50))<1e-6)))
    print()
