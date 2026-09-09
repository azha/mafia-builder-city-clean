# m17 — LE FILET DE TETE EST UNE RAMPE D'ALPHA : test de modele a UNE variable.
# CSS : .tete::after {left:22.4; right:22.4; background:linear-gradient(90deg,transparent,laiton 30%,...)}
#   => alpha(x) = (x-22.4)/(0.30*515.2) sature a 1. C'est une grandeur CONNUE, pas ajustee.
# Pour chaque x on predit le pixel sous sRGB et sous LINEAIRE, avec le fond et le laiton MESURES
# sur CHAQUE image. CONTROLE POSITIF : au plateau (alpha=1) les deux predictions coincident et
# doivent tomber a <=3/255 — sinon l'instrument est faux.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def s2l(v):
    v/=255.0
    return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
def l2s(v):
    v=max(0.0,min(1.0,v))
    return 255.0*(12.92*v if v<=0.0031308 else 1.055*v**(1/2.4)-0.055)
FIL={'REF':115.0,'JEU':128.75}
SPAN=0.30*(560-2*22.4)   # 154.56 CSS
for S in (R,C):
    yc=FIL[S['nom']]; im=S['im'].load()
    def echant(xc,demi=1.2):
        a=P(S,xc-demi,yc); b=P(S,xc+demi,yc)
        vals=[im[x,int(round(P(S,0,yc)[1]))] for x in range(int(a[0]),int(b[0])+1)]
        vals.sort(key=lambda c:sum(c)); return vals[len(vals)//2]
    fond=mediane(S,150,yc-7,350,yc-4)
    plein=echant(280,4)
    print(f'\n===== {S["nom"]} (filet y={yc} CSS) — fond {fond} · laiton plein {plein} =====')
    print(f'  {"x CSS":>7} {"alpha":>6} {"mesure":>15} {"pred sRGB":>15} {"d":>4} {"pred LIN":>15} {"d":>4}  gagnant')
    tot_s=tot_l=0
    for xc in (30,35,40,45,50,60,70,90,120,150,280):
        al=min(1.0,max(0.0,(xc-22.4)/SPAN))
        m=echant(xc)
        ps=tuple(round(plein[i]*al+fond[i]*(1-al)) for i in range(3))
        pl=tuple(round(l2s(s2l(plein[i])*al+s2l(fond[i])*(1-al))) for i in range(3))
        ds=max(abs(m[i]-ps[i]) for i in range(3)); dl=max(abs(m[i]-pl[i]) for i in range(3))
        if xc!=280: tot_s+=ds; tot_l+=dl
        g='sRGB' if ds<dl else ('LIN' if dl<ds else '=')
        marque='   <-- CONTROLE (alpha=1, les deux predictions coincident)' if xc==280 else ''
        print(f'  {xc:7d} {al:6.3f} {str(m):>15} {str(ps):>15} {ds:4d} {str(pl):>15} {dl:4d}  {g}{marque}')
    print(f'  SOMME des ecarts (hors controle) : sRGB {tot_s}  ·  LINEAIRE {tot_l}   => modele retenu : {"sRGB" if tot_s<tot_l else "LINEAIRE"}')
