# -- m36 : hauteurs de CAPITALE. Methode : isoler des glyphes par leurs colonnes, mesurer la boite de CHAQUE glyphe,
#    ne garder que les MAJUSCULES sans accent ni jambage, prendre la mediane.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib2 import *
orvif  = lambda p: abs(p[0]-242)<24 and abs(p[1]-201)<28 and abs(p[2]-107)<45 and p[0]-p[2]>90
creme2 = lambda p: abs(p[0]-185)<24 and abs(p[1]-173)<24 and abs(p[2]-146)<28 and p[0]>p[2]+20
creme  = lambda p: abs(p[0]-234)<20 and abs(p[1]-224)<20 and abs(p[2]-200)<26
sombre = lambda p: p[0]<70 and p[1]<60 and p[2]<40   # encre sombre sur bouton or

def glyphes(key, box, pred, nom):
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    cols={}
    for xp in range(X0,X1):
        ys=[yp for yp in range(Y0,Y1) if pred(d[xp,yp])]
        if ys: cols[xp]=(min(ys),max(ys),len(ys))
    xs=sorted(cols); groups=[]
    for x in xs:
        if groups and x-groups[-1][-1]<=1: groups[-1].append(x)
        else: groups.append([x])
    out=[]
    for g in groups:
        y0=min(cols[x][0] for x in g); y1=max(cols[x][1] for x in g)
        out.append(((g[0])/s,(g[-1]+1)/s,(y0)/s,(y1+1)/s,(y1+1-y0)/s))
    print("   %s %s : %d groupes"%(key,nom,len(out)))
    for a,b,c,e,h in out:
        print("      x %7.2f..%7.2f (l=%5.2f)  y %7.2f..%7.2f  h=%5.2f"%(a,b,b-a,c,e,h))
    return out

print("=== TITRE de la fiche ===")
glyphes('ref',(20,440,376,462),orvif,'canon « LE VERGE D\'OR »')
print()
glyphes('c19',(20,440,376,462),orvif,'jeu « Reparation Ilm ... »')
