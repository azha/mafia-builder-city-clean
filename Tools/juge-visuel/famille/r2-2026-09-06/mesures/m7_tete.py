# m7 — TETE : hauteur (haut de feuille -> filet), bouton retour, titre, sous-titre.
# Controle positif : la largeur de la feuille (560 CSS) est identique par construction ; on verifie
# que le x0 du bouton retour tombe a la meme valeur CSS des deux cotes (CSS .tete padding 26.13).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
print('\n--- filet de tete (.tete::after, laiton) : premiere ligne ou un pixel laiton traverse le milieu ---')
for S in (R,C):
    im=S['im'].load()
    trouve=None
    for yc in [y/4 for y in range(400,600)]:
        x,y=P(S,280,yc)
        c=im[int(x),int(y)]
        if c[0]-c[2]>25 and c[0]>60:
            trouve=yc; break
    # bornes horizontales du filet
    yy=int(P(S,0,trouve)[1])
    xs=[x for x in range(int(P(S,0,0)[0]),int(P(S,560,0)[0])) if im[x,yy][0]-im[x,yy][2]>12 and im[x,yy][0]>40]
    print(f'{S["nom"]}: filet a y CSS {trouve:.2f} ; x CSS {toCSS(S,xs[0],0)[0]:.1f}..{toCSS(S,xs[-1]+1,0)[0]:.1f} ; couleur milieu {im[int(P(S,280,trouve)[0]),yy]}')
print('\n--- bouton retour (.retour 56x56, x0 CSS attendu 26.13) ---')
for S in (R,C):
    fond=mediane(S,150,10,200,60)
    bb=bbox_encre(S,10,5,95,105,fond,seuil=10)
    print(f'{S["nom"]}: fond local {fond} ; bbox anneau CSS {bb} ; diam {bb[2]-bb[0]:.2f} x {bb[3]-bb[1]:.2f}')
print('\n--- titre "LA FAMILLE" (or-vif) ---')
for S in (R,C):
    im=S['im'].load(); a=P(S,95,20); b=P(S,560,62)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            c=im[x,y]
            if c[0]>150 and c[0]-c[2]>50:
                X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    print(f'{S["nom"]}: x {c0[0]:.2f}..{c1[0]:.2f} (chasse {c1[0]-c0[0]:.2f}) ; y {c0[1]:.2f}..{c1[1]:.2f} (haut. capitale {c1[1]-c0[1]:.2f}) ; couleur {mediane(S,(c0[0]+c1[0])/2-0.4,(c0[1]+c1[1])/2-0.4,(c0[0]+c1[0])/2+0.4,(c0[1]+c1[1])/2+0.4)}')
print('\n--- sous-titre "3 LIEUTENANTS" (creme-2) ---')
for S in (R,C):
    im=S['im'].load(); a=P(S,95,64); b=P(S,560,110)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            c=im[x,y]
            if c[0]>110 and c[1]>100:
                X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    print(f'{S["nom"]}: x {c0[0]:.2f}..{c1[0]:.2f} (chasse {c1[0]-c0[0]:.2f}) ; y {c0[1]:.2f}..{c1[1]:.2f} (haut. capitale {c1[1]-c0[1]:.2f})')
