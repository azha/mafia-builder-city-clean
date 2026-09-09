# m21 — BOITE "Recruter" : bornes reelles (cotes verticaux, pas le bord haut arrondi) + texte + centrage.
# Controle positif : la largeur doit valoir 560-2*22.4 = 515,2 CSS des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
BOX={'REF':(835.0,906.0),'JEU':(872.7,943.0)}
for S in (R,C):
    y0,y1=BOX[S['nom']]; im=S['im'].load(); ym=(y0+y1)/2
    fond=mediane(S,300,ym-3,340,ym+3)
    # cotes verticaux : on balaye une bande de 8 CSS de haut au milieu, on prend le x le plus a gauche/droite clair
    xs=[]
    for dy in [d/2 for d in range(-16,17)]:
        yy=int(round(P(S,0,ym+dy)[1]))
        for xc in range(10,80):
            x=int(round(P(S,xc,0)[0]))
            if lum(im[x,yy])>lum(fond)+8: xs.append(xc); break
    xd=[]
    for dy in [d/2 for d in range(-16,17)]:
        yy=int(round(P(S,0,ym+dy)[1]))
        for xc in range(552,500,-1):
            x=int(round(P(S,xc,0)[0]))
            if x<S['im'].size[0] and lum(im[x,yy])>lum(fond)+8: xd.append(xc); break
    xg=min(xs) if xs else None; xdd=max(xd) if xd else None
    # bornes verticales
    yy=[]
    for yc in [y/2 for y in range(int((y0-14)*2),int((y1+14)*2))]:
        Y=int(round(P(S,0,yc)[1]))
        if Y>=S['im'].size[1]: break
        n=sum(1 for xc in range(120,420,2) if lum(im[int(round(P(S,xc,0)[0])),Y])>lum(fond)+8)
        if n>60: yy.append(yc)
    # texte
    a=P(S,60,yy[0]+6); b=P(S,510,yy[-1]-6)
    X0=Y0=10**9;X1=Y1=-10**9
    for Y in range(int(a[1]),int(b[1])):
        for X in range(int(a[0]),int(b[0])):
            c=im[X,Y]
            if c[0]>110 and c[1]>100: X0=min(X0,X);X1=max(X1,X);Y0=min(Y0,Y);Y1=max(Y1,Y)
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    print(f'\n{S["nom"]} boite "Recruter" :')
    print(f'   cotes x {xg}..{xdd} (largeur {xdd-xg+1}) · bornes y {yy[0]:.1f}..{yy[-1]:.1f} (h {yy[-1]-yy[0]:.1f}) · fond local {fond}')
    print(f'   texte x {c0[0]:.2f}..{c1[0]:.2f} (chasse {c1[0]-c0[0]:.2f}) y {c0[1]:.2f}..{c1[1]:.2f} (h encre {c1[1]-c0[1]:.2f})')
    print(f'   centre du texte {(c0[0]+c1[0])/2:.2f} vs centre de la boite {(xg+xdd+1)/2:.2f} -> ecart {(c0[0]+c1[0])/2-(xg+xdd+1)/2:+.2f}')
    print(f'   marge texte->bord haut {c0[1]-yy[0]:.1f} · bord bas->texte {yy[-1]-c1[1]:.1f}')
