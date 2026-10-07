# m30 — LE POINT A TRANCHER : ou manque la lumiere dans le decor, et un GAIN MULTIPLICATIF
# fermerait-il l'ecart sans bruler les hautes lumieres ?
#
# Methode :
#  1. appariement pixel a pixel REF<->JEU avec le recalage mesure en m29 (s,dx,dy passes en arg) ;
#  2. l'ecart est decrit PAR TIERS DE GAMME, les tiers etant definis sur la REFERENCE
#     (tiers bas / moyen / haut = terciles de la luminance de REF) — c'est la question posee ;
#  3. SIMULATION : on applique au JEU, en lineaire, un gain g (sur la part "teinte", c.-a-d.
#     AVANT le plancher additif), et on recalcule l'ecart. Le plancher additif est modelise en
#     retirant d'abord +5/255 en sRGB au JEU, en multipliant la partie restante, puis en le remettant.
#  4. on cherche le g qui minimise l'ecart median, et on imprime p99 pour la brulure.
#
# Controle positif : a g=1 la simulation doit reproduire EXACTEMENT les percentiles mesures.
# Controle negatif : a g=2 les hautes lumieres doivent saturer (p99 proche de 255) — si non,
# la simulation ne mord pas.
import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures')
from _base import REF,J19,J24,lum,charge

PLANCHER=5.0/255.0   # le plancher additif livre (r4b) : +5/255 aux noirs, ~0 au-dela de 60

def pairs(J,s,dx,dy,yj0,yj1,pas=3):
    ir=charge(REF); ij=charge(J)
    pxr=ir.load(); pxj=ij.load(); wr,hr=ir.size
    out=[]
    for y in range(yj0,yj1,pas):
        for x in range(60,1020,3):
            X=int(s*x+dx); Y=int(s*y+dy)
            if 0<=X<wr and 0<=Y<hr: out.append((pxr[X,Y],pxj[x,y]))
    return out

def perc(v,q):
    v=sorted(v); return v[min(len(v)-1,int(len(v)*q/100))]

def rapport(P,nom):
    A=[lum(a) for a,b in P]; B=[lum(b) for a,b in P]
    n=len(A)
    print(f'  {nom}: n={n}  moy REF {sum(A)/n:.2f}  JEU {sum(B)/n:.2f}  rapport {sum(B)/sum(A):.3f}')
    # terciles definis sur la REFERENCE
    t1=perc(A,33.33); t2=perc(A,66.67)
    print(f'    terciles de la REF : t1={t1:.2f}  t2={t2:.2f}')
    for lib,sel in [('BAS   (ref<t1)',lambda a:a<t1),
                    ('MOYEN (t1<=ref<t2)',lambda a:t1<=a<t2),
                    ('HAUT  (ref>=t2)',lambda a:a>=t2)]:
        ia=[i for i in range(n) if sel(A[i])]
        ma=sum(A[i] for i in ia)/len(ia); mb=sum(B[i] for i in ia)/len(ia)
        print(f'    {lib:20s} n={len(ia):7d}  REF {ma:6.2f}  JEU {mb:6.2f}  JEU/REF {mb/ma:.3f}  manque {ma-mb:+.2f}')
    return A,B

def srgb2lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def lin2srgb(v):
    v=max(0.0,min(1.0,v))
    s=v*12.92 if v<=0.0031308 else 1.055*(v**(1/2.4))-0.055
    return max(0.0,min(255.0,s*255.0))

PL_LIN=srgb2lin(PLANCHER*255.0)

def simule(P,g):
    """applique au JEU un gain g sur la TEINTE (avant plancher), en lineaire."""
    out=[]
    for a,b in P:
        c=[]
        for k in range(3):
            lv=srgb2lin(b[k])
            lv=max(0.0,lv-PL_LIN)      # on retire le plancher additif
            lv=lv*g                     # gain multiplicatif sur la teinte
            lv=lv+PL_LIN                # on le remet
            c.append(lin2srgb(lv))
        out.append((a,tuple(c)))
    return out

def bilan(P,g,etiq):
    Q=simule(P,g) if g!=1.0 else P
    A=[lum(a) for a,b in Q]; B=[lum(b) for a,b in Q]
    n=len(A)
    l=f'    g={g:5.3f} {etiq:10s} moy {sum(B)/n:6.2f}/{sum(A)/n:6.2f}={sum(B)/sum(A):.3f}'
    for q in (10,25,50,75,90,99):
        l+=f'  p{q}={perc(B,q)/max(perc(A,q),1e-9):.3f}'
    l+=f'  | p99 JEU={perc(B,99):.1f} REF={perc(A,99):.1f}  satures(>250)={100*sum(1 for v in B if v>250)/n:.3f}%'
    print(l)
    return [perc(B,q)/max(perc(A,q),1e-9) for q in (10,25,50,75,90,99)]

if __name__=='__main__':
    import json
    s,dx,dy=float(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3])
    J=J19 if sys.argv[4]=='1920' else J24
    yj0,yj1=int(sys.argv[5]),int(sys.argv[6])
    print(f'== recalage utilise : REF = {s:.4f}*JEU + ({dx},{dy}) ==')
    P=pairs(J,s,dx,dy,yj0,yj1)
    rapport(P,'decor apparie')
    print('  --- simulation du gain multiplicatif (sur la teinte, plancher additif conserve) ---')
    print('      (rapports JEU/REF par percentile ; 1.000 = egal)')
    for g in (1.0,1.05,1.10,1.15,1.20,1.25,1.30,1.40,1.60,2.00):
        bilan(P,g,'')
