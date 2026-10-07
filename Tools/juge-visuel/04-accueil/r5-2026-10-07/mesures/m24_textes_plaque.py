# m24 — textes de la plaque TRANCHER : « Lt. X attend vos ordres », la gravite (LEGERE),
# et TRANCHER. Hauteur de capitale par profil de lignes (cf. m13) + couleur.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
PLQ={'REF':(1674,1825),'JEU1920':(1487,1635),'JEU2400':(1906,2103)}
def analyse(im,nom):
    px=im.load(); y0,y1=PLQ[nom]
    base=med([lum(px[x,y]) for y in range(y0+10,y1-10) for x in range(100,700)])
    rows=[(y,[x for x in range(90,720) if lum(px[x,y])-base>22]) for y in range(y0,y1)]
    print(f'  --- {nom} plaque y{y0}..{y1} h={y1-y0+1} ---')
    bandes=[];cur=None
    for y,xs in rows:
        if len(xs)>1 and cur is None: cur=[y,min(xs),max(xs)]
        elif len(xs)>1: cur[1]=min(cur[1],min(xs)); cur[2]=max(cur[2],max(xs))
        elif cur is not None: bandes.append((cur[0],y-1,cur[1],cur[2])); cur=None
    if cur: bandes.append((cur[0],y1-1,cur[1],cur[2]))
    for a,z,xa,xb in bandes:
        pp=[(x,y) for y in range(a,z+1) for x in range(xa,xb+1) if lum(px[x,y])-base>30]
        pp=sorted(pp,key=lambda q:lum(px[q[0],q[1]]),reverse=True)[:60]
        col=tuple(med([px[q[0],q[1]][k] for q in pp]) for k in range(3)) if pp else None
        print(f'    bande y {a}..{z} h={z-a+1}  x {xa}..{xb} l={xb-xa+1}  couleur encre {col}')
    print(f'    marge haute={bandes[0][0]-y0}  marge basse={y1-bandes[-1][1]}  bord G texte={bandes[0][2]}')
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: analyse(charge(p),n)
