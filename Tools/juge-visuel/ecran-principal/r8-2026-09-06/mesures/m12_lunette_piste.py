# -*- coding: utf-8 -*-
"""m12 - lunette (anneau interieur), piste neutre, pivot (aire equivalente).
CONTROLE POSITIF lunette : la source pose `.medaillon .lunette{inset:3px;border:1px solid #ffffff1e;
box-shadow:0 0 10px #23406a66 inset}` -> un anneau a 3 CSS du bord, soit r = (32-3)/32 = 0.906 R.
CONTROLE NEGATIF : le meme profil pris a l'INTERIEUR (0.40..0.55 R) ne doit montrer aucun maximum local."""
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

print("=== m12 ===")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle)
    a=ANC[cle]; d=CAD[cle]; bcx,bcy=a['cx'],a['cy']; Rb=a['r_nom_ext']
    print("\n-- %s  R_nominal_ext = %.2f CSS"%(cle,Rb))
    # LUNETTE : profil radial median de L sur 720 rayons (encre claire exclue)
    pr=[]
    for k in range(int(0.60*Rb*20), int(1.02*Rb*20)+1):
        r=k/20.0; vals=[]
        for j in range(720):
            th=2*math.pi*j/720
            c=ech(im,f,bcx+r*math.cos(th), bcy-r*math.sin(th))
            vals.append(L(c))
        pr.append((r/Rb, mediane(vals)))
    print("   profil L radial (u=r/R -> L) :")
    print("     "+"  ".join("%.3f:%.1f"%(u,v) for u,v in pr[::4]))
    zone=[(u,v) for u,v in pr if 0.78<=u<=0.945]
    i=max(range(len(zone)), key=lambda k:zone[k][1])
    g=min(v for u,v in zone[:i]) if i>0 else zone[i][1]
    dr=min(v for u,v in zone[i+1:]) if i+1<len(zone) else zone[i][1]
    print("   LUNETTE (fenetre 0.78..0.945 R) : max local L=%.1f a u=%.3f ; creux avant %.1f apres %.1f => saillie %+.1f L"
          %(zone[i][1],zone[i][0],g,dr,zone[i][1]-max(g,dr)))
    zn=[(u,v) for u,v in pr if 0.60<=u<=0.72]
    j2=max(range(len(zn)),key=lambda k:zn[k][1])
    print("   [controle negatif] fenetre 0.60..0.72 R : max L=%.1f a u=%.3f ; amplitude de la fenetre %.1f L"
          %(zn[j2][1],zn[j2][0],max(v for _,v in zn)-min(v for _,v in zn)))
    # PISTE NEUTRE : ou est la piste grise ? balayage angulaire a plusieurs rayons
    print("   piste neutre -- L median par angle a plusieurs rayons (encre exclue) :")
    for rr in [11.0,14.0,15.5,17.0,19.0,22.0]:
        ech_ang=[]
        for deg in range(0,181,10):
            c=ech(im,f, bcx+rr*math.cos(math.radians(deg)), bcy-rr*math.sin(math.radians(deg)))
            ech_ang.append("%d:%.0f"%(deg,L(c)))
        print("      r=%4.1f : %s"%(rr," ".join(ech_ang)))
    # PIVOT : aire equivalente + bbox du masque laiton
    def est_laiton(c):
        r,g_,b=c
        return (r-b)>=60 and 120<=r<=215 and 100<=g_<=185 and (r-g_)>=20
    px=im.load(); P=[]
    for yy in range(int((d['pvy']-5)*f), int((d['pvy']+5)*f)):
        for xx in range(int((d['pvx']-5)*f), int((d['pvx']+5)*f)):
            if est_laiton(px[xx,yy]): P.append((xx/f,yy/f))
    aire=len(P)/(f*f)
    xs=[p[0] for p in P]; ys=[p[1] for p in P]
    print("   PIVOT : %d px -> aire %.2f CSS^2 -> diametre equivalent %.2f CSS ; bbox %.2f x %.2f CSS"
          %(len(P),aire,2*math.sqrt(aire/math.pi),max(xs)-min(xs),max(ys)-min(ys)))
