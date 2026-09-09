# m28 : complements — creme, peau, fond du cadre, gradient de la boite de compteur.
import sys; sys.path.insert(0,'.')
from lib import *
IMS={n:ouvrir(n) for n in ('reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png')}
PX={n:IMS[n].load() for n in IMS}
R,A,B='reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png'

print("\n-- creme du libelle de compteur (pixel le plus clair du trait) --")
def plus_clair(px,xs,ys):
    best=None
    for y in ys:
        for x in xs:
            c=px[x,y]
            if best is None or lum(c)>lum(best[0]): best=(c,x,y)
    return best
print("   ref :", plus_clair(PX[R],range(80,330),range(778,800)))
print("   2400:", plus_clair(PX[A],range(70,320),range(804,828)))
print("   1920:", plus_clair(PX[B],range(70,320),range(570,596)))

print("\n-- peau du visage : bbox et couleur --")
PEAU=(185,173,146)
def bbox_peau(px,xs,ys,t=18):
    pts=[(x,y) for y in ys for x in xs if all(abs(px[x,y][i]-PEAU[i])<=t for i in range(3))]
    if not pts: return None
    X=[p[0] for p in pts]; Y=[p[1] for p in pts]
    return (min(X),max(X),min(Y),max(Y),len(pts))
print("   ref :", bbox_peau(PX[R],range(150,420),range(1020,1220)))
print("   2400:", bbox_peau(PX[A],range(120,420),range(930,1130)))
print("   1920:", bbox_peau(PX[B],range(150,450),range(880,1090)))

print("\n-- fond du CADRE (hors tout panneau) --")
for etiq,f,pt in [('ref',R,(540,1630)),('2400',A,(540,1570)),('1920',B,(540,1338))]:
    print("   %-5s a %s : %s" % (etiq,pt,mediane_fenetre(PX[f],pt[0],pt[1],4)))

print("\n-- gradient vertical DANS la boite de compteur 1 (medianes de rangee) --")
for etiq,f,ya,yb,xa,xb in [('ref',R,706,812,56,356),('2400',A,731,837,52,354),('1920',B,499,605,52,354)]:
    px=PX[f]
    ech=[ya+2, (ya+yb)//2, yb-2]
    vals=[]
    for y in ech:
        vals.append((y, tuple(int(mediane([px[x,y][k] for x in range(xa,xb)])) for k in range(3))))
    amp=[max(v[1][k] for v in vals)-min(v[1][k] for v in vals) for k in range(3)]
    print("   %-5s %s  amplitude R/G/B = %s" % (etiq, " -> ".join("y%d:%s"%v for v in vals), amp))
