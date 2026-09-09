import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *
orvif  = lambda p: abs(p[0]-242)<24 and abs(p[1]-201)<28 and abs(p[2]-107)<45 and p[0]-p[2]>90
def glyphes(key, box, pred, nom):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    cols={}
    for xp in range(X0,X1):
        ys=[yp for yp in range(Y0,Y1) if pred(d[xp,yp])]
        if ys: cols[xp]=(min(ys),max(ys))
    xs=sorted(cols); groups=[]
    for x in xs:
        if groups and x-groups[-1][-1]<=1: groups[-1].append(x)
        else: groups.append([x])
    print("   %-4s %s"%(key,nom))
    hs=[]
    for g in groups:
        y0=min(cols[x][0] for x in g); y1=max(cols[x][1] for x in g)
        h=(y1+1-y0)/s; hs.append(h)
        print("      x %7.2f..%7.2f (l=%5.2f)  y %7.2f..%7.2f  h=%5.2f"%(g[0]/s,(g[-1]+1)/s,(g[-1]+1-g[0])/s,y0/s,(y1+1)/s,h))
    hs.sort(); print("      ⇒ mediane h = %.2f ; max = %.2f"%(hs[len(hs)//2],hs[-1]))
print("=== MONTANT du bandeau : glyphes ===")
glyphes('ref',(14,18,150,40),orvif,'canon « $ 24 850 »')
glyphes('c19',(60,22,165,42),orvif,'jeu « 9 627 820,00 € »')
