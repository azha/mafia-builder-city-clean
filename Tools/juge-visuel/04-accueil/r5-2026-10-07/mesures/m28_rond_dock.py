# m28 — diametre du 1er rond du dock (EMPIRE), mesure sur son ANNEAU : pour chaque ligne y de la
# zone, longueur entre les deux pixels les plus clairs de part et d'autre du centre.
# Le diametre = la plus grande corde trouvee (l'equateur), pas une ligne choisie d'avance
# (m26 lisait une ligne fixe : deux ronds decales en y y rendent deux cordes differentes).
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
Z={'REF':(1870,1990),'JEU1920':(1690,1800),'JEU2400':(2170,2280)}
def rond(im,nom,xa=190,xb=330):
    px=im.load(); y0,y1=Z[nom]
    base=med([lum(px[x,y]) for y in range(y0,y1) for x in range(xa,xb)])
    best=None
    for y in range(y0,y1):
        xs=[x for x in range(xa,xb) if lum(px[x,y])-base>4]
        if len(xs)>=2:
            c=max(xs)-min(xs)+1
            if best is None or c>best[0]: best=(c,y,min(xs),max(xs))
    print(f'    {nom:8s} rond EMPIRE : corde max={best[0]} a y={best[1]} (x {best[2]}..{best[3]})  fond lum={base:.1f}')
    return best
for n,p in [('REF',REF),('JEU1920',J19),('JEU2400',J24)]: rond(charge(p),n)
