# m37 — complements d'annexe : bornes reelles (a) du bouton retour, (b) de la boite d'equipe
# (par ses COTES verticaux, pas par le bord haut arrondi), (c) largeur du rail principal.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
print('\n(a) BOUTON RETOUR — bbox de l\'anneau (exces >= 6/255 sur le fond local)')
for S,cy in ((R,57.5),(C,55.75)):
    im=S['im'].load(); fond=mediane(S,110,45,150,62)
    X0=Y0=10**9;X1=Y1=-10**9
    a=P(S,18,20); b=P(S,92,95)
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            if lum(im[x,y])-lum(fond)>6: X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    print(f'  {S["nom"]}: x {c0[0]:.2f}..{c1[0]:.2f} y {c0[1]:.2f}..{c1[1]:.2f}  diam {c1[0]-c0[0]:.2f} x {c1[1]-c0[1]:.2f}')
print('\n(b) BOITE D\'EQUIPE 1 — cotes verticaux')
for S,(y0,y1) in ((R,(368.5,439.0)),(C,(380.0,450.5))):
    im=S['im'].load(); ym=(y0+y1)/2; fond=mediane(S,300,ym-4,340,ym+4)
    xs=[];xd=[]
    for dy in [d/2 for d in range(-30,31)]:
        Y=int(round(P(S,0,ym+dy)[1]))
        for xc in [t/4 for t in range(4*85,4*130)]:
            if lum(im[int(round(P(S,xc,0)[0])),Y])>lum(fond)+8: xs.append(xc); break
        for xc in [t/4 for t in range(4*548,4*505,-1)]:
            X=int(round(P(S,xc,0)[0]))
            if X<S['im'].size[0] and lum(im[X,Y])>lum(fond)+8: xd.append(xc); break
    print(f'  {S["nom"]}: x {min(xs):.2f}..{max(xd):.2f} (largeur {max(xd)-min(xs)+0.25:.2f}) · y {y0:.1f}..{y1:.1f}')
print('\n(c) RAIL PRINCIPAL — largeur a mi-hauteur')
for S,ym in ((R,500.0),(C,520.0)):
    im=S['im'].load(); Y=int(round(P(S,0,ym)[1]))
    xs=[xc for xc in [t/8 for t in range(8*28,8*38)] if (lambda c: c[0]>45 and c[0]-c[2]>10)(im[int(round(P(S,xc,0)[0])),Y])]
    print(f'  {S["nom"]}: x {xs[0]:.2f}..{xs[-1]:.2f} (largeur {xs[-1]-xs[0]+0.125:.2f})')
