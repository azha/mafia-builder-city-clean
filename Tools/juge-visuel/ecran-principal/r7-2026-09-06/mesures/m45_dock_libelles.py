# -- m45 : libelles du dock : bandes, puis FOND local (mediane des pixels a >=3 CSS de toute encre) et CONTRASTE.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
DY={'ref':0.0,'c19':0.0,'c24':174.222,'t24':174.222}
creme2 = lambda p: abs(p[0]-185)<26 and abs(p[1]-173)<26 and abs(p[2]-146)<30 and p[0]>p[2]+18
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); d=im.load(); dy=DY[key]
    ys={}
    for yp in range(int((665+dy)*s),int((695+dy)*s)):
        n=sum(1 for xp in range(int(60*s),int(340*s)) if creme2(d[xp,yp]))
        if n: ys[yp]=n
    if ys:
        a=min(ys); b=max(ys)
        print("  %-4s bande des libelles : y %.2f..%.2f (h=%.2f CSS), pic %d px"%(key,a/s-dy,(b+1)/s-dy,(b+1-a)/s,max(ys.values())))
    # contraste par onglet
    for nom,cx in [('EMPIRE',94),('FAMILLE',162),('3e',230),('PLUS',298)]:
        X0=int((cx-26)*s); X1=int((cx+26)*s)
        enc=[];fond=[]
        for yp in range(a,b+1):
            for xp in range(X0,X1):
                p=d[xp,yp]
                if creme2(p): enc.append(p)
        # fond : pixels a >=3 CSS de toute encre, dans une bande elargie
        k=int(round(3*s))
        for yp in range(a-k,b+1+k):
            for xp in range(X0,X1):
                if any(creme2(d[min(max(xp+ddx,0),im.width-1),min(max(yp+ddy,0),im.height-1)]) for ddx in range(-k,k+1,2) for ddy in range(-k,k+1,2)): continue
                fond.append(d[xp,yp])
        if not enc or not fond: print("     %-8s : insuffisant"%nom); continue
        e=tuple(sorted(v[c] for v in enc)[len(enc)//2] for c in range(3))
        f=tuple(sorted(v[c] for v in fond)[len(fond)//2] for c in range(3))
        print("     %-8s encre %-16s fond %-16s ⇒ %.2f:1"%(nom,str(e),str(f),contrast(e,f)))
