# -*- coding: utf-8 -*-
"""m06 - LA mesure du cadran : centre de courbure de chaque arc, rayon, bornes angulaires
a mi-hauteur, INTERSTICE, epaisseur radiale le long de l'arc, forme des embouts.

CONVENTION D'ANGLE (declaree) : 0 deg = vers la DROITE (+x), sens TRIGO (anti-horaire a l'ecran).
  A) primaire  : origine = CENTRE DU BOITIER (la pastille circulaire que l'oeil prend pour le
     centre de l'instrument) -- c'est la convention qui rend les nombres du r7 reproductibles.
  B) controle   : origine = PIVOT de l'aiguille (l'axe physique du gabarit).
Les deux sont imprimees : un finding qui ne tient que sous une convention n'est pas un finding.

CONTROLE POSITIF (issu de la SOURCE, pas de l'image) : canon, convention B (pivot) ->
  arc braise = 0.00 deg .. 60.55 deg ; arc teal = 90.00 .. 180.00 ; interstice = 29.45 deg ;
  rayon de courbure 18.20 CSS ; epaisseur 2.45 CSS."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *

CAD=json.load(open('cadran.json')); ANC=json.load(open('ancres.json'))

def fit(P, c0, span=16.0):
    best=None
    for pas,sp in [(0.5,span),(0.05,1.0)]:
        cx0,cy0 = (c0 if best is None else (best[1],best[2]))
        k=int(sp/pas)
        for i in range(-k,k+1):
            for j in range(-k,k+1):
                cx,cy=cx0+i*pas,cy0+j*pas
                r=sorted(math.hypot(p[0]-cx,p[1]-cy) for p in P)
                q=r[int(.85*len(r))]-r[int(.15*len(r))]
                if best is None or q<best[0]: best=(q,cx,cy,mediane(r))
    return best

print("=== m06 : cadran ===")
print("[controle positif SOURCE] canon/pivot : braise 0.00..60.55, teal 90.00..180.00, vide 29.45 deg ; R=18.20 ; ep=2.45\n")
resume={}
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    a=ANC[cle]; d=CAD[cle]
    bcx,bcy=a['cx'],a['cy']; pvx,pvy=d['pvx'],d['pvy']
    T=[tuple(p) for p in d['teal']]; B=[tuple(p) for p in d['braise']]
    print("-- %s   boitier (%.2f;%.2f)  pivot (%.2f;%.2f)"%(cle,bcx,bcy,pvx,pvy))
    fits={}
    for nom,P in [('teal',T),('braise',B),('teal+braise',T+B)]:
        q,cx,cy,R=fit(P,(bcx,bcy))
        fits[nom]=(cx,cy,R,q)
        print("   courbure %-12s centre (%.2f ; %.2f)  R=%.2f CSS  spread(p15-p85)=%.2f  [pivot%+.2f ; %+.2f]"
              %(nom,cx,cy,R,q,cx-pvx,cy-pvy))
    # --- bornes angulaires a mi-hauteur, sous les deux conventions
    def bornes(P, ox, oy):
        ang=[(math.degrees(math.atan2(oy-p[1], p[0]-ox))%360.0) for p in P]
        ang=[x-360 if x>270 else x for x in ang]
        ang.sort()
        # 2e et 98e centile pour ecarter l'antialiasing isole
        n=len(ang)
        return ang[int(.02*n)], ang[int(.98*n)]
    for nom,(ox,oy) in [('A boitier',(bcx,bcy)),('B pivot',(pvx,pvy))]:
        tb=bornes(T,ox,oy); bb=bornes(B,ox,oy)
        vide=tb[0]-bb[1]
        print("   %s : BRAISE %6.2f..%6.2f deg | TEAL %6.2f..%6.2f deg | INTERSTICE %5.2f deg | course %.2f deg"
              %(nom,bb[0],bb[1],tb[0],tb[1],vide,tb[1]-bb[0]))
        if nom=='A boitier': resume[cle]=dict(braise=bb,teal=tb,vide=vide,course=tb[1]-bb[0])
    # --- epaisseur radiale perpendiculaire, le long de chaque arc (autour de SON centre de courbure)
    for nom,P in [('teal',T),('braise',B)]:
        cx,cy,R,_=fits[nom]
        par={}
        for p in P:
            th=round(math.degrees(math.atan2(cy-p[1], p[0]-cx))*2)/2.0
            par.setdefault(th,[]).append(math.hypot(p[0]-cx,p[1]-cy))
        ths=sorted(par)
        # bande utile : on jette les 2 deg extremes (embouts) pour l'epaisseur "courante"
        ep=[(t, max(par[t])-min(par[t])) for t in ths if len(par[t])>=3]
        cour=[e for t,e in ep if ths[0]+2 < t < ths[-1]-2]
        print("   ep. radiale %-6s : courante mediane %.2f CSS (min %.2f max %.2f sur %d angles) ; R %.2f"
              %(nom, mediane(cour), min(cour), max(cour), len(cour), R))
        # profil aux embouts (10 premiers et 10 derniers demi-degres) => fuselage ?
        deb=[("%.1f:%.2f"%(t,e)) for t,e in ep[:9]]
        fin=[("%.1f:%.2f"%(t,e)) for t,e in ep[-9:]]
        print("      embout DEBUT (angle:ep) %s"%(" ".join(deb)))
        print("      embout FIN   (angle:ep) %s"%(" ".join(fin)))
    print()
json.dump(resume,open('cadran_resume.json','w'),indent=1)
