# m11 — RANG DU DON : fente du NOM, fente du ROLE, ecart entre les deux, medaillon.
# Controle positif : le medaillon du Don (meme composant) doit avoir le meme diametre des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
DON={'REF':(136.0,236.0),'JEU':(150.0,247.3)}
def bb(S,x0,y0,x1,y1,test):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            if test(im[x,y]): X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    if X1<X0: return None
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1); return (round(c0[0],2),round(c0[1],2),round(c1[0],2),round(c1[1],2))
orvif = lambda c: c[0]>170 and c[0]-c[2]>60
creme2= lambda c: 120<c[0]<225 and c[1]>110 and c[2]>90 and c[0]-c[2]<70 and c[0]-c[2]>10
for S in (R,C):
    top,bot=DON[S['nom']]
    print(f'\n===== {S["nom"]} rang du Don, haut {top} bas {bot} (h {bot-top:.1f}) =====')
    n=bb(S,120,top+5,400,top+50,orvif)
    r=bb(S,120,top+48,400,bot-4,creme2)
    print(f'  NOM  (or-vif) CSS x {n[0]:.2f}..{n[2]:.2f} (chasse {n[2]-n[0]:.2f}) ; y rel {n[1]-top:.2f}..{n[3]-top:.2f} (h {n[3]-n[1]:.2f})')
    print(f'  ROLE (creme-2) CSS x {r[0]:.2f}..{r[2]:.2f} (chasse {r[2]-r[0]:.2f}) ; y rel {r[1]-top:.2f}..{r[3]-top:.2f} (h {r[3]-r[1]:.2f})')
    print(f'  ECART bas du NOM -> haut du ROLE = {r[1]-n[3]:.2f} CSS')
    # medaillon du don : anneau or-vif
    m=bb(S,20,top+2,130,bot-2, lambda c: c[0]>150 and c[0]-c[2]>50)
    print(f'  medaillon du Don (anneau or-vif) x {m[0]:.2f}..{m[2]:.2f} y rel {m[1]-top:.2f}..{m[3]-top:.2f} ; diam {m[2]-m[0]:.2f} x {m[3]-m[1]:.2f}')
    print(f'  couleur du NOM (mediane d\'un trait plein) = ', end='')
    # echantillon : colonne la plus dense du nom
    im=S['im'].load(); a=P(S,n[0],n[1]); b=P(S,n[2],n[3]); best=(0,None)
    for x in range(int(a[0]),int(b[0])):
        cnt=sum(1 for y in range(int(a[1]),int(b[1])) if orvif(im[x,y]))
        if cnt>best[0]: best=(cnt,x)
    xs=best[1]; vals=[im[xs,y] for y in range(int(a[1]),int(b[1])) if orvif(im[xs,y])]
    vals.sort(key=lambda c:sum(c)); print(vals[len(vals)//2], f'(colonne x={toCSS(S,xs,0)[0]:.1f}, {len(vals)} px)')
