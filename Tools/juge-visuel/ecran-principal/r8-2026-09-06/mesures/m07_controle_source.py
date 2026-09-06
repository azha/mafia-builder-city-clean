# -*- coding: utf-8 -*-
"""m07 - CONTROLE de l'instrument : le canon doit retrouver la geometrie ECRITE dans la source.
Source (hud-brennar.html) : svg 60x40 dans une boite 44x28 -> echelle 0.700 ; pivot viewBox (30;34) ;
arcs R=26 vb = 18.20 CSS autour de (30 ; 47.856) vb = pivot + (0 ; +9.70) CSS.
Extremites attendues, en CSS absolus (pivot mesure = origine) :
  teal   (8;34)->(-15.40 ; 0.00)   (30;8)->(0.00 ; -18.20)
  braise (43;11)->(+9.10 ; -16.10) (52;34)->(+15.40 ; 0.00)
Si l'instrument ne les retrouve pas sur le CANON, il ne mesure pas ce que je crois."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
CAD=json.load(open('cadran.json')); ANC=json.load(open('ancres.json'))

for cle in ['canon','j1920','j2400']:
    d=CAD[cle]; pvx,pvy=d['pvx'],d['pvy']
    print("\n== %s  pivot (%.2f ; %.2f)"%(cle,pvx,pvy))
    ccx,ccy = pvx, pvy-9.70      # centre de courbure PREDIT par la source
    for nom in ['teal','braise']:
        P=[tuple(p) for p in d[nom]]
        r=sorted(math.hypot(p[0]-ccx,p[1]-ccy) for p in P)
        n=len(r)
        print("   %-6s : depuis le centre PREDIT (%.2f;%.2f) -> rayons p05=%.2f p25=%.2f MED=%.2f p75=%.2f p95=%.2f  (attendu 18.20 +- 1.23)"
              %(nom,ccx,ccy,r[int(.05*n)],r[int(.25*n)],mediane(r),r[int(.75*n)],r[int(.95*n)]))
        # extremites : les 4 points extremes en angle depuis le centre predit
        A=[(math.degrees(math.atan2(ccy-p[1], p[0]-ccx)), p) for p in P]
        A.sort()
        print("      extremites (depuis centre de courbure predit) : %.1f deg en (%.2f ; %.2f)  ->  %.1f deg en (%.2f ; %.2f)"
              %(A[0][0],A[0][1][0]-pvx,A[0][1][1]-pvy, A[-1][0],A[-1][1][0]-pvx,A[-1][1][1]-pvy))
        # boite englobante en coordonnees relatives au pivot
        xs=[p[0]-pvx for p in P]; ys=[p[1]-pvy for p in P]
        print("      bbox / pivot : x %.2f..%.2f   y %.2f..%.2f  CSS"%(min(xs),max(xs),min(ys),max(ys)))
print("""
ATTENDU canon (source) :
  teal   bbox/pivot : x -15.40..0.00 (+/- 1.23 de demi-trait)  y -18.20..0.00
  braise bbox/pivot : x  +9.10..+15.40                          y -16.10..0.00""")
