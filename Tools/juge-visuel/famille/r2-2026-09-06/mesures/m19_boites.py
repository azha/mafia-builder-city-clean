# m19 — BOITES POINTILLEES (.vide) : bbox, periode du pointille, texte, et boite "Recruter".
# Controle positif : la largeur de la boite "Recruter" doit valoir 560-2*22.4 = 515,2 CSS des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def bordbox(S,ysearch0,ysearch1,x0=15,x1=545):
    """cherche une boite pointillee : lignes ou l'on trouve >=20 segments clairs sur la largeur"""
    im=S['im'].load(); lignes=[]
    for yc in [y/2 for y in range(int(ysearch0*2),int(ysearch1*2))]:
        y=int(round(P(S,0,yc)[1])); n=0
        for xc in range(x0,x1):
            x=int(round(P(S,xc,0)[0]))
            c=im[x,y]
            if lum(c)>lum(mediane(S,300,yc-4,320,yc-2))+12: n+=1
        lignes.append((yc,n))
    return lignes
print('\n=== boites pointillees : bornes et periode ===')
BOITES={'REF':[(352.0,440.0,'equipe 1'),(1),(0)],'JEU':[]}
def analyse(S,nom,ymin,ymax):
    im=S['im'].load()
    # bord haut : premiere ligne avec >=60 px clairs
    fond=mediane(S,300,ymin-6,340,ymin-2)
    cand=[]
    for yc in [y/2 for y in range(int(ymin*2),int(ymax*2))]:
        y=int(round(P(S,0,yc)[1])); n=sum(1 for xc in range(110,530) if lum(im[int(round(P(S,xc,0)[0])),y])>lum(fond)+10)
        cand.append((yc,n))
    hauts=[yc for yc,n in cand if n>120]
    if not hauts: print(f'  {S["nom"]} {nom}: rien'); return
    yh,yb=hauts[0],hauts[-1]
    y=int(round(P(S,0,yh)[1]))
    xs=[xc for xc in range(80,545) if lum(im[int(round(P(S,xc,0)[0])),y])>lum(fond)+10]
    # periode : transitions on/off le long du bord haut
    seq=[]; prev=False
    for xc in [x/4 for x in range(int(xs[0]*4),int(xs[-1]*4))]:
        on=lum(im[int(round(P(S,xc,0)[0])),y])>lum(fond)+10
        if on and not prev: seq.append(xc)
        prev=on
    per=(seq[-1]-seq[0])/(len(seq)-1) if len(seq)>3 else float('nan')
    print(f'  {S["nom"]} {nom}: y {yh:.1f}..{yb:.1f} (h {yb-yh:.1f}) · x {xs[0]}..{xs[-1]} (larg {xs[-1]-xs[0]+1}) · periode du pointille {per:.2f} CSS ({len(seq)} tirets)')
    # texte a l'interieur
    X0=Y0=10**9;X1=Y1=-10**9
    a=P(S,120,yh+4); b=P(S,520,yb-4)
    for yy in range(int(a[1]),int(b[1])):
        for xx in range(int(a[0]),int(b[0])):
            c=im[xx,yy]
            if c[0]>110 and c[1]>100: X0=min(X0,xx);X1=max(X1,xx);Y0=min(Y0,yy);Y1=max(Y1,yy)
    c0=toCSS(S,X0,Y0); c1=toCSS(S,X1+1,Y1+1)
    cx=(c0[0]+c1[0])/2; centre=(xs[0]+xs[-1]+1)/2
    print(f'      texte x {c0[0]:.1f}..{c1[0]:.1f} y {c0[1]:.1f}..{c1[1]:.1f} (h {c1[1]-c0[1]:.1f}) · centre du texte {cx:.1f} vs centre de la boite {centre:.1f} (ecart {cx-centre:+.1f})')
analyse(R,'boite equipe 1',356,450)
analyse(C,'boite equipe 1',372,460)
analyse(R,'boite "Recruter"',855,922)
analyse(C,'boite "Recruter"',862,960)
