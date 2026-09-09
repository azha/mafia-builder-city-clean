# -*- coding: utf-8 -*-
"""m10 - INTERSTICE (segment neutre) et bornes de secteur, par COUVERTURE (pas par percentile).
Bin d'angle 0.5 deg ; un angle est 'occupe' par une classe si le nombre de pixels de cette classe
dans ce bin atteint 30 % du compte MEDIAN des bins occupes -- critere insensible a l'antialiasing
isole et a la longueur de l'arc.
CONVENTION D'ANGLE : 0 deg = vers la DROITE, sens TRIGO. Deux origines, toutes deux imprimees :
  A) CENTRE DU BOITIER (primaire ; c'est le centre que l'oeil prend et celui du r7)
  B) PIVOT de l'aiguille.
CONTROLE POSITIF (source) : canon convention A -> braise fin 51.1 deg, teal debut 90.0 deg,
vide 38.9 deg ; convention B -> braise fin 60.55, teal debut 90.00, vide 29.45."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json')); CAD=json.load(open('cadran.json'))

def bornes(P, ox, oy, frac=0.30):
    h={}
    for p in P:
        a=math.degrees(math.atan2(oy-p[1], p[0]-ox))
        if a<-90: a+=360
        h[round(a*2)/2.0]=h.get(round(a*2)/2.0,0)+1
    med=mediane(sorted(h.values()))
    seuil=max(1.0, med*frac)
    bons=sorted(k for k in h if h[k]>=seuil)
    return bons[0], bons[-1], len(bons), med

print("=== m10 : bornes de secteur et INTERSTICE ===")
print("[controle positif SOURCE] canon : conv.A braise->51.1 teal 90.0 vide 38.9 | conv.B braise->60.55 teal 90.00 vide 29.45\n")
lignes=[]
for cle in ['canon','j1920','j2400']:
    a=ANC[cle]; d=CAD[cle]
    T=[tuple(p) for p in d['teal']]; B=[tuple(p) for p in d['braise']]
    for nom,(ox,oy) in [('A boitier',(a['cx'],a['cy'])),('B pivot',(d['pvx'],d['pvy']))]:
        b0,b1,nb,mb=bornes(B,ox,oy); t0,t1,nt,mt=bornes(T,ox,oy)
        print("%-6s %-10s : BRAISE %7.2f .. %7.2f  |  TEAL %7.2f .. %7.2f  |  INTERSTICE %6.2f deg  |  course totale %6.2f deg"
              %(cle,nom,b0,b1,t0,t1,t0-b1,t1-b0))
        lignes.append((cle,nom,b0,b1,t0,t1,t0-b1,t1-b0))
# sensibilite au seuil de couverture (l'interstice doit etre stable)
print("\n[sensibilite] interstice (conv. A) selon la fraction de couverture :")
for frac in [0.15,0.30,0.50,0.70]:
    out=[]
    for cle in ['canon','j1920','j2400']:
        a=ANC[cle]; d=CAD[cle]
        b=bornes([tuple(p) for p in d['braise']],a['cx'],a['cy'],frac)
        t=bornes([tuple(p) for p in d['teal']],a['cx'],a['cy'],frac)
        out.append("%s %.2f"%(cle,t[0]-b[1]))
    print("   frac=%.2f : %s"%(frac,"   ".join(out)))
json.dump(lignes,open('interstice.json','w'),indent=1)
