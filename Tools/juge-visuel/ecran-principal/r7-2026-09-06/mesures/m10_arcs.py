# -- m10 : les ARCS du cadran. Rayon, epaisseur radiale, secteurs angulaires, couleur.
#    0 deg = a droite, sens trigonometrique (haut = 90).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def scan_r(key, a0, a1, metric):
    """profil radial du 90e centile de la metrique sur le secteur [a0,a1] deg"""
    s=sc(key); im=img(key); cx,cy=C[key]
    out=[]; r=5.0
    while r<=24.0:
        v=[]
        for i in range(int((a1-a0)*2)+1):
            th=math.radians(a0+i*0.5)
            p=bil(im,s,cx+r*math.cos(th),cy-r*math.sin(th)); v.append(metric(p))
        v.sort(); out.append((r,v[int(0.9*(len(v)-1))])); r+=0.1
    return out

teal  = lambda p: (p[1]+p[2])/2 - p[0]
brz   = lambda p: p[0]-(p[1]+p[2])/2

for key in ['ref','c19','c24']:
    print("=== %s ==="%key)
    pt=scan_r(key,95,175,teal); pb=scan_r(key,5,80,brz)
    bt=max(pt,key=lambda t:t[1]); bb=max(pb,key=lambda t:t[1])
    print("  TEAL  (secteur 95..175 deg) : pic %.1f a r=%.1f ; profil "%(bt[1],bt[0])+" ".join("%.0f:%d"%(r,v) for r,v in pt if abs(r*2-round(r*2))<1e-9))
    print("  BRAISE(secteur   5..80 deg) : pic %.1f a r=%.1f ; profil "%(bb[1],bb[0])+" ".join("%.0f:%d"%(r,v) for r,v in pb if abs(r*2-round(r*2))<1e-9))
