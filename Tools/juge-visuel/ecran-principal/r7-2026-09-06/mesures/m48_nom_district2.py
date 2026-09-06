# -- m48 : « La Lisière » : boite, capitale, encre, contour, fond, contrastes.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
enc = lambda p: p[0]>195 and p[1]>185 and p[2]>155 and p[0]-p[2]<70 and abs(p[0]-p[1])<25
for key in ['c19','c24','d24']:
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in (2,80,60,100)]
    xs=[];ys=[];E=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            p=d[xp,yp]
            if enc(p): xs.append(xp/s); ys.append(yp/s); E.append(p)
    if not E: print("  %s AUCUN"%key); continue
    e=tuple(sorted(v[c] for v in E)[len(E)//2] for c in range(3))
    x0,x1,y0,y1=min(xs),max(xs)+1/s,min(ys),max(ys)+1/s
    # contour : pixels sombres adjacents a l'encre
    cont=[]; fond=[]
    k=int(round(4*s))
    for yp in range(Y0-k,Y1+k):
        for xp in range(X0-k,X1+k):
            p=d[xp,yp]
            if enc(p): continue
            proche=any(enc(d[min(max(xp+a,0),im.width-1),min(max(yp+b,0),im.height-1)]) for a in(-1,0,1) for b in(-1,0,1))
            loin=not any(enc(d[min(max(xp+a,0),im.width-1),min(max(yp+b,0),im.height-1)]) for a in range(-k,k+1) for b in range(-k,k+1))
            if proche: cont.append(p)
            elif loin: fond.append(p)
    c=tuple(sorted(v[i] for v in cont)[len(cont)//2] for i in range(3)) if cont else None
    f=tuple(sorted(v[i] for v in fond)[len(fond)//2] for i in range(3)) if fond else None
    print("  %-4s bbox x %.2f..%.2f  y %.2f..%.2f (h=%.2f)  encre %s | contour %s | fond %s"%(key,x0,x1,y0,y1,y1-y0,str(e),str(c),str(f)))
    if f: print("        encre/fond = %.2f:1   encre/contour = %.2f:1   contour/fond = %.2f:1"%(contrast(e,f),contrast(e,c),contrast(c,f)))
