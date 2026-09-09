# m32 — BOITE du rang du Don, mesuree sur sa BORDURE (1px #d9ab4e44), pas sur le degrade :
# le detecteur B-R de m5 coupe tot sur ce panneau (bordure doree, pas bleue).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
for S,(y0,y1) in ((R,(125,250)),(C,(138,262))):
    im=S['im'].load(); ys=[]
    for yc in [t/4 for t in range(int(4*y0),int(4*y1))]:
        Y=int(round(P(S,0,yc)[1]))
        n=sum(1 for xc in range(60,500,2) if (lambda c: c[0]-c[2]>12 and c[0]>45)(im[int(round(P(S,xc,0)[0])),Y]))
        if n>100: ys.append(yc)
    xs=[]
    ym=(ys[0]+ys[-1])/2
    for xc in [t/4 for t in range(4*10,4*60)]:
        if (lambda c: c[0]-c[2]>12 and c[0]>45)(im[int(round(P(S,xc,0)[0])),int(round(P(S,0,ym)[1]))]): xs.append(xc); break
    for xc in [t/4 for t in range(4*550,4*500,-1)]:
        X=int(round(P(S,xc,0)[0]))
        if X<S['im'].size[0] and (lambda c: c[0]-c[2]>12 and c[0]>45)(im[X,int(round(P(S,0,ym)[1]))]): xs.append(xc); break
    print(f'  {S["nom"]} don-rang : y {ys[0]:.2f}..{ys[-1]:.2f} (h {ys[-1]-ys[0]:.2f}) · x {xs[0]:.2f}..{xs[1]:.2f} (larg {xs[1]-xs[0]:.2f})')
