import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *
orvif  = lambda p: abs(p[0]-242)<24 and abs(p[1]-201)<28 and abs(p[2]-107)<45 and p[0]-p[2]>90
creme2 = lambda p: abs(p[0]-185)<24 and abs(p[1]-173)<24 and abs(p[2]-146)<28 and p[0]>p[2]+20
creme  = lambda p: abs(p[0]-234)<20 and abs(p[1]-224)<20 and abs(p[2]-200)<26
def glyphes(key, box, pred, nom, verbose=False):
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
    out=[]
    for g in groups:
        y0=min(cols[x][0] for x in g); y1=max(cols[x][1] for x in g)
        out.append(((g[0])/s,(g[-1]+1)/s,y0/s,(y1+1)/s,(y1+1-y0)/s))
    hs=sorted(o[4] for o in out)
    print("   %-4s %-30s n=%2d  x %.2f..%.2f (l=%.2f)  hauteurs : mediane %.2f  max %.2f  min %.2f"
          %(key,nom,len(out),out[0][0],out[-1][1],out[-1][1]-out[0][0],hs[len(hs)//2],hs[-1],hs[0]))
    if verbose:
        for a,b,c,e,h in out: print("        x %7.2f..%7.2f  y %7.2f..%7.2f  h=%5.2f"%(a,b,c,e,h))
    return out
print("=== SOUS-TITRE de la fiche (capitales espacees) ===")
glyphes('ref',(20,466,376,482),creme2,'canon « BAR . QUARTIER GENERAL »')
glyphes('c19',(20,466,376,482),creme2,'jeu « OPERATIONNEL »')
print("=== LIBELLES de stats (crème-2) ===")
glyphes('ref',(20,514,376,528),creme2,'canon (3 libelles)')
glyphes('c19',(20,514,376,528),creme2,'jeu (3 libelles)')
print("=== VALEURS de stats ===")
glyphes('ref',(20,492,376,512),orvif,'canon val.1 (or-vif)')
glyphes('c19',(20,492,376,512),orvif,'jeu val.1 (or-vif)')
glyphes('ref',(130,492,376,512),creme,'canon val.2/3 (creme)')
glyphes('c19',(130,492,376,512),creme,'jeu val.2/3 (creme)')
print("=== LIBELLES des boutons (creme) ===")
glyphes('ref',(140,550,376,568),creme,'canon BLANCHIR+AMELIORER')
glyphes('c19',(140,550,376,568),creme,'jeu BLANCHIR+AMELIORER')
