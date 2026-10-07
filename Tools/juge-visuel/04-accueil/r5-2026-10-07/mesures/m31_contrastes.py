# m31 — contrastes WCAG des textes du panneau contre leur fond reel (percentile 95 de l'encre
# contre la mediane du fond local). Ce que le joueur DOIT pouvoir lire.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge
def med(v): v=sorted(v); return v[len(v)//2]
def rl(c):
    def f(u):
        u/=255.0
        return u/12.92 if u<=0.04045 else ((u+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def ratio(a,b):
    la,lb=rl(a),rl(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def mesure(im,nom,zones):
    px=im.load(); print(f'  --- {nom} ---')
    for lib,(xa,xb,ya,yb) in zones.items():
        vals=[(lum(px[x,y]),px[x,y]) for y in range(ya,yb) for x in range(xa,xb)]
        vals.sort()
        fond=tuple(med([vals[i][1][k] for i in range(len(vals)//10)]) for k in range(3))
        encre=tuple(med([vals[-1-i][1][k] for i in range(max(8,len(vals)//50))]) for k in range(3))
        print(f'    {lib:16s} encre {encre}  fond {fond}  contraste {ratio(encre,fond):.2f}:1')
ref=charge(REF); j19=charge(J19); j24=charge(J24)
mesure(ref,'REF',{'titre1':(101,606,946,990),'sous1':(101,414,1004,1034),
                  'LA SUITE':(456,618,869,891),'lib fantome':(744,939,1440,1485),
                  'LEGERE':(88,209,1764,1786)})
mesure(j19,'JEU1920',{'titre1':(98,570,868,906),'sous1':(98,430,926,957),
                  'LA SUITE':(465,611,795,815),'lib fantome':(768,943,1300,1345),
                  'LEGERE':(79,156,1573,1592)})
mesure(j24,'JEU2400',{'titre1':(98,570,1274,1313),'sous1':(98,430,1332,1364),
                  'LA SUITE':(465,611,1201,1221),'lib fantome':(768,943,1707,1752),
                  'LEGERE':(79,156,2016,2035)})
