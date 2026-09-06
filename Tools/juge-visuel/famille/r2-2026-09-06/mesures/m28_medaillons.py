# m28 — LOCALISATION DES MEDAILLONS (le repere de m12 et m27 etait faux : je le refais ici et je
# rejoue les deux mesures dessus). L'anneau est cherche dans une fenetre qui EXCLUT le rail (x>=60).
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANGS={'REF':[('don',136.0,236.0,'or'),('lt1',252.5,353.0,'lai'),('lt2',454.5,553.5,'lai'),('lt3',629.5,728.5,'lai')],
       'JEU':[('don',150.0,247.3,'or'),('lt1',264.3,363.8,'lai'),('lt2',465.9,565.3,'lai'),('lt3',667.4,766.9,'lai')]}
def anneau(S,x0,x1,y0,y1,kind):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    test=(lambda c: c[0]>150 and c[0]-c[2]>50) if kind=='or' else (lambda c: c[0]>110 and c[0]-c[2]>28)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            if test(im[x,y]): X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    return c0[0],c0[1],c1[0],c1[1]
CENTRES={}
for S in (R,C):
    print(f'\n===== {S["nom"]} — medaillons =====')
    CENTRES[S['nom']]={}
    for nom,top,bot,kind in RANGS[S['nom']]:
        xg = 30 if nom=='don' else 55
        x0,y0,x1,y1=anneau(S,xg,(120 if nom=='don' else 145),top+3,bot-3,kind)
        cx,cy=(x0+x1)/2,(y0+y1)/2; r=((x1-x0)+(y1-y0))/4
        CENTRES[S['nom']][nom]=(cx,cy,r)
        print(f'  {nom:4s} bbox x {x0:.2f}..{x1:.2f} y {y0:.2f}..{y1:.2f} | diam {x1-x0:.2f} x {y1-y0:.2f} | centre ({cx:.2f},{cy:.2f}) r {r:.2f} | centre x rel au rang, y rel {cy-top:.2f}')
print('\n===== HALO du medaillon du DON, repris sur le VRAI centre =====')
def halo(S,cx,cy,r,label):
    im=S['im'].load(); base=mediane(S,cx+120,cy-6,cx+170,cy+6)
    prof=[];t=0.0
    while t<=12.0:
        xc=cx-r-1.5-t; x,y=P(S,xc,cy)
        prof.append((round(t,2),im[int(round(x)),int(round(y))][0]-base[0])); t+=0.5
    integ=sum(max(0,d) for t,d in prof)*0.5; pic=max(d for t,d in prof)
    print(f'  {label:26s} base {base} integrale exces R {integ:6.1f} pic {pic:+3d} portee(>=2) {max([t for t,d in prof if d>=2]+[0]):.1f} CSS')
    print(f'      {" ".join(f"{t:.0f}:{d:+d}" for t,d in prof[::2])}')
    return integ
iR=halo(R,*CENTRES['REF']['don'],'REF don (box-shadow)')
iC=halo(C,*CENTRES['JEU']['don'],'JEU don')
nR=halo(R,*CENTRES['REF']['lt1'],'REF lieutenant (CONTROLE -)')
nC=halo(C,*CENTRES['JEU']['lt1'],'JEU lieutenant (CONTROLE -)')
print(f'  => halo net : REF {iR-nR:.1f} · JEU {iC-nC:.1f}  (rapport {100*(iC-nC)/max(1e-9,iR-nR):.0f} %)')
print('\n===== BUSTES, repris sur le VRAI centre =====')
buste=lambda c: 150<c[0]<235 and 140<c[1]<225 and 110<c[2]<200 and c[0]-c[2]>18 and c[0]-c[1]<35
for S in (R,C):
    print(f'  --- {S["nom"]} ---')
    for nom in ('don','lt1','lt3'):
        cx,cy,r=CENTRES[S['nom']][nom]; im=S['im'].load()
        a=P(S,cx-r,cy-r); b=P(S,cx+r,cy+r)
        X0=Y0=10**9;X1=Y1=-10**9;n=0;larg={}
        for y in range(int(a[1]),int(b[1])):
            xs=[x for x in range(int(a[0]),int(b[0])) if buste(im[x,y])]
            if xs: n+=len(xs);X0=min(X0,xs[0]);X1=max(X1,xs[-1]);Y0=min(Y0,y);Y1=max(Y1,y);larg[y]=(xs[0],xs[-1])
        c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
        ys=sorted(larg); base=larg[ys[-3]]
        print(f'    {nom:4s} bbox %disque x {100*(c0[0]-(cx-r))/(2*r):5.1f}..{100*(c1[0]-(cx-r))/(2*r):5.1f}'
              f' y {100*(c0[1]-(cy-r))/(2*r):5.1f}..{100*(c1[1]-(cy-r))/(2*r):5.1f}'
              f' · aire {100*n/(3.1416*(r*S["f"])**2):5.1f} % · largeur d\'EPAULES {100*((base[1]-base[0]+1)/S["f"])/(2*r):5.1f} %')
