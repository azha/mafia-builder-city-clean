# -*- coding: utf-8 -*-
"""m09 - centre de courbure de CHAQUE arc, par minimisation de l'ecart-type des rayons
(critere non gameable, contrairement a un interquartile). CONTROLE : sur le canon, la source
donne teal centre vb(34.00;33.69) R=26 et braise centre vb(26.19;30.84) R=26 -- soit, en CSS
(pivot vb(30;34) <-> pivot mesure, echelle 0.700) : teal (pivot+2.80 ; -0.22) R=18.20 et
braise (pivot-2.67 ; -2.21) R=18.20. Le fit DOIT y tomber."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
CAD=json.load(open('cadran.json'))

def et(P,cx,cy):
    r=[math.hypot(p[0]-cx,p[1]-cy) for p in P]
    m=sum(r)/len(r)
    return (sum((x-m)**2 for x in r)/len(r))**0.5, m

def fit(P,c0):
    best=None
    for sp,pas in [(20.0,0.5),(1.0,0.05)]:
        cx0,cy0=(c0 if best is None else (best[1],best[2]))
        k=int(sp/pas)
        for i in range(-k,k+1):
            for j in range(-k,k+1):
                cx,cy=cx0+i*pas,cy0+j*pas
                s,m=et(P,cx,cy)
                if best is None or s<best[0]: best=(s,cx,cy,m)
    return best

print("=== m09 : centre de courbure par arc ===")
for cle in ['canon','j1920','j2400']:
    d=CAD[cle]; pvx,pvy=d['pvx'],d['pvy']
    print("\n-- %s  pivot (%.2f ; %.2f)"%(cle,pvx,pvy))
    if cle=='canon':
        for nom,dx,dy in [('teal',2.80,-0.22),('braise',-2.67,-2.21)]:
            P=[tuple(p) for p in d[nom]]
            s,m=et(P,pvx+dx,pvy+dy)
            print("   [CONTROLE source] %-6s centre PREDIT (%.2f ; %.2f) -> ecart-type %.3f  R moyen %.3f  (attendu R=18.20)"
                  %(nom,pvx+dx,pvy+dy,s,m))
    for nom in ['teal','braise']:
        P=[tuple(p) for p in d[nom]]
        s,cx,cy,R=fit(P,(pvx,pvy))
        ang=[math.degrees(math.atan2(cy-p[1],p[0]-cx)) for p in P]
        ang=[a+360 if a<-90 else a for a in ang]
        ang.sort(); n=len(ang)
        # bornes par COUVERTURE : histogramme 0.5 deg, run contigu ou le compte >= 25% de la mediane
        h={}
        for a in ang: h[round(a*2)/2.0]=h.get(round(a*2)/2.0,0)+1
        med=mediane(sorted(h.values()))
        ks=sorted(h); seuil=max(1,med*0.25)
        bons=[k for k in ks if h[k]>=seuil]
        print("   fit %-6s : centre (%.2f ; %.2f) [pivot%+.2f;%+.2f]  R=%.2f  ecart-type %.3f  |  arc %.2f..%.2f deg  ETENDUE %.2f deg"
              %(nom,cx,cy,cx-pvx,cy-pvy,R,s,bons[0],bons[-1],bons[-1]-bons[0]))
