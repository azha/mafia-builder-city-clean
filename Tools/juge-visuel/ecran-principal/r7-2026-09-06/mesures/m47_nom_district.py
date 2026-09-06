# -- m47 : nom du district (« La Lisière »), present dans le JEU seulement : boite, capitale, contraste sur l'art REEL.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
creme = lambda p: p[0]>200 and p[1]>195 and p[2]>170 and abs(p[0]-p[1])<25
for key,box in [('c19',(5,60,120,80)),('c24',(5,60,120,80)),('d24',(5,60,120,80))]:
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    enc=[];xs=[];ys=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            p=d[xp,yp]
            if creme(p): enc.append(p); xs.append(xp/s); ys.append(yp/s)
    if not enc: print("  %s : AUCUN"%key); continue
    e=tuple(sorted(v[c] for v in enc)[len(enc)//2] for c in range(3))
    # fond : pixels a >= 4 CSS de toute encre, dans une bande elargie
    k=int(round(4*s)); fond=[]
    for yp in range(Y0-k,Y1+k):
        for xp in range(X0-4,X1+k):
            if any(creme(d[min(max(xp+a,0),im.width-1),min(max(yp+b,0),im.height-1)]) for a in range(-k,k+1,3) for b in range(-k,k+1,3)): continue
            fond.append(d[xp,yp])
    f=tuple(sorted(v[c] for v in fond)[len(fond)//2] for c in range(3))
    fs=sorted(fond,key=lum)
    print("  %-4s bbox x %.2f..%.2f y %.2f..%.2f (h=%.2f)  encre %s  fond median %s ⇒ %.2f:1 | fond le plus clair %s ⇒ %.2f:1"
          %(key,min(xs),max(xs)+1/s,min(ys),max(ys)+1/s,max(ys)+1/s-min(ys),str(e),str(f),contrast(e,f),str(fs[int(0.95*len(fs))]),contrast(e,fs[int(0.95*len(fs))])))
