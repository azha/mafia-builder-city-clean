# m22 — plaque TRANCHER : bornes, hauteur, liseré, texte « Lt. X attend vos ordres », « LÉGÈRE », « TRANCHER ».
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
BORD={'REF':(31,37,46),'JEU1920':(34,38,46),'JEU2400':(34,38,46)}
XG={'REF':46,'JEU1920':47,'JEU2400':47}; XD={'REF':1031,'JEU1920':1030,'JEU2400':1030}
def plaque(im,nom,y0,y1,tol=12):
    px=im.load(); b=BORD[nom]
    ok=[y for y in range(y0,y1)
        if max(abs(px[XG[nom]+1,y][i]-b[i]) for i in range(3))<=tol
        and max(abs(px[XD[nom]+1,y][i]-b[i]) for i in range(3))<=tol]
    print(f'  --- {nom} plaque : lignes a liseré lateral y {ok[0]}..{ok[-1]} ({len(ok)}) ; hauteur droite={ok[-1]-ok[0]+1}')
    return ok[0],ok[-1]
def textes(im,nom,y0,y1):
    px=im.load()
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(100,600)])
    rows=[(y,sum(1 for x in range(90,700) if lum(px[x,y])-base>25)) for y in range(y0,y1)]
    s=''.join('#' if n>1 else '.' for y,n in rows)
    print(f'    encre colonne gauche y{y0}..{y1} : {s}')
    # TRANCHER (or) a droite
    pts=[(x,y) for y in range(y0,y1) for x in range(700,1020) if px[x,y][0]>120 and px[x,y][0]-px[x,y][2]>50]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f'    TRANCHER (or) x {min(xs)}..{max(xs)} l={max(xs)-min(xs)+1}  y {min(ys)}..{max(ys)} CAPh={max(ys)-min(ys)+1}  couleur {px[(min(xs)+max(xs))//2, (min(ys)+max(ys))//2]}')
ref=charge(REF); j19=charge(J19); j24=charge(J24)
a,b=plaque(ref,'REF',1650,2000); textes(ref,'REF',a,b)
a,b=plaque(j19,'JEU1920',1440,1700); textes(j19,'JEU1920',a,b)
a,b=plaque(j24,'JEU2400',1840,2150); textes(j24,'JEU2400',a,b)
