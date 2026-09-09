# m29 — RAILS, ERGOTS, PUCE : les liaisons de l'arbre et la pastille.
# Controle positif : l'ergot du rang (.rang::before, 16,8 CSS de long) doit mesurer ~17 des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
lai=lambda c: c[0]>50 and c[0]-c[2]>12
print('\n=== ERGOT du rang (.rang::before) — a mi-hauteur du rang 1 ===')
for S,ym in ((R,302.8),(C,314.5)):
    im=S['im'].load(); y=int(round(P(S,0,ym)[1]))
    xs=[xc for xc in [x/4 for x in range(4*25,4*60)] if lai(im[int(round(P(S,xc,0)[0])),y])]
    print(f'  {S["nom"]}: x {xs[0]:.2f}..{xs[-1]:.2f} (longueur {xs[-1]-xs[0]:.2f}) couleur {im[int(round(P(S,(xs[0]+xs[-1])/2,0)[0])),y]}')
print('\n=== RAIL D\'EQUIPE (.equipe::before, #b08d3e55) — colonne, sous le rang 1 ===')
for S,(y0,y1) in ((R,(360,435)),(C,(372,447))):
    im=S['im'].load()
    ym=(y0+y1)/2; y=int(round(P(S,0,ym)[1]))
    xs=[xc for xc in [x/4 for x in range(4*65,4*85)] if lai(im[int(round(P(S,xc,0)[0])),y])]
    # bornes verticales
    ys=[]
    for yc in [t/2 for t in range(int(2*(y0-16)),int(2*(y1+16)))]:
        Y=int(round(P(S,0,yc)[1]))
        if any(lai(im[int(round(P(S,xc,0)[0])),Y]) for xc in [x/4 for x in range(4*72,4*77)]): ys.append(yc)
    print(f'  {S["nom"]}: x {xs[0]:.2f}..{xs[-1]:.2f} (larg {xs[-1]-xs[0]+0.25:.2f}) · y {ys[0]:.1f}..{ys[-1]:.1f} (h {ys[-1]-ys[0]:.1f}) · couleur {im[int(round(P(S,(xs[0]+xs[-1])/2,0)[0])),y]}')
print('\n=== PUCE : bbox du contour, epaisseur, rayon (pilule), position dans le rang ===')
cyb=lambda c: c[2]>80 and c[2]-c[0]>18
for S,top in ((R,629.5),(C,264.3)):
    im=S['im'].load()
    a=P(S,145,top+45); b=P(S,300,top+95)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            if cyb(im[x,y]): X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    print(f'  {S["nom"]}: bbox x {c0[0]:.2f}..{c1[0]:.2f} (larg {c1[0]-c0[0]:.2f}) y rel {c0[1]-top:.2f}..{c1[1]-top:.2f} (h {c1[1]-c0[1]:.2f})')
    # epaisseur du contour a mi-hauteur
    ymid=int(round(P(S,0,(c0[1]+c1[1])/2)[1]))
    run=[];prev=False
    for xc in [x/4 for x in range(int(4*(c0[0]-2)),int(4*(c0[0]+8)))]:
        on=cyb(im[int(round(P(S,xc,0)[0])),ymid])
        if on and not prev: s=xc
        if (not on) and prev: run.append((s,xc)); break
        prev=on
    print(f'      epaisseur du contour (bord gauche) {run[0][1]-run[0][0]:.2f} CSS' if run else '      contour non isole')
