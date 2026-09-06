# -- m58 : ronds du dock : diametre, centres, pas (mesure PROPRE, pas reprise du r6) ; + capitale des libellés.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222}
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    # ligne horizontale au centre des ronds (y ~ 638) : chercher le cerclage clair de chaque rond
    yp=int(round((638.7+dy)*s))
    prof=[(xp/s, lum(d[xp,yp])) for xp in range(int(60*s),int(340*s))]
    # bords = maxima locaux du gradient ; on prend par groupe autour de chaque centre nominal
    cents=[]
    for cx in [94,162,230,298]:
        seg=[(x,L) for x,L in prof if abs(x-cx)<30]
        # le rond est plus SOMBRE (jeu) ou plus CLAIR (canon) que le fond : on prend le bord par saut de |dL|
        ds=[(seg[i][0], abs(seg[i+1][1]-seg[i][1])) for i in range(len(seg)-1)]
        g=[x for x,v in ds if v>3.0]
        if len(g)>=2:
            cents.append(((g[0]+g[-1])/2, g[-1]-g[0]))
    print("  %-4s y=%.1f : "%(key,638.7)+" | ".join("centre %.2f Ø %.2f"%(c,w) for c,w in cents))
    if len(cents)==4:
        print("        pas : "+" · ".join("%.2f"%(cents[i+1][0]-cents[i][0]) for i in range(3)))
print()
print("=== capitale des libelles du dock (glyphes sans accent) ===")
creme2 = lambda p: abs(p[0]-185)<26 and abs(p[1]-173)<26 and abs(p[2]-146)<30 and p[0]>p[2]+18
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    X0,Y0,X1,Y1=[int(round(v*s)) for v in (70,665+dy,120,680+dy)]
    cols={}
    for xp in range(X0,X1):
        ys=[yp for yp in range(Y0,Y1) if creme2(d[xp,yp])]
        if ys: cols[xp]=(min(ys),max(ys))
    xs=sorted(cols); groups=[]
    for x in xs:
        if groups and x-groups[-1][-1]<=1: groups[-1].append(x)
        else: groups.append([x])
    hs=[]
    for g in groups:
        y0=min(cols[x][0] for x in g); y1=max(cols[x][1] for x in g); hs.append((y1+1-y0)/s)
    hs.sort()
    print("   %-4s EMPIRE : %d glyphes, hauteurs %s ⇒ mediane %.2f CSS"%(key,len(hs)," ".join("%.2f"%h for h in hs),hs[len(hs)//2] if hs else -1))
