# m10 — ANATOMIE D'UN RANG, en coordonnees RELATIVES au haut du rang (CSS).
# Temoins HOMOLOGUES : reference = rang 3 "Blanchiment" (NON .actif, puce cyan, pas de jambage) ;
# jeu = rang 1 "Lt. Oster" (puce cyan, pas de jambage). Le rang 1 de la reference est .actif -> ecarte.
# Controle positif : le medaillon (meme composant des deux cotes) doit tomber au meme y relatif.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANGS={'REF':[(252.5,353.0),(454.5,553.5),(629.5,728.5)],
       'JEU':[(264.3,363.8),(465.9,565.3),(667.4,766.9)]}
def bb(S,x0,y0,x1,y1,test):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    X0=Y0=10**9;X1=Y1=-10**9
    for y in range(int(a[1]),int(b[1])):
        for x in range(int(a[0]),int(b[0])):
            if test(im[x,y]):
                X0=min(X0,x);X1=max(X1,x);Y0=min(Y0,y);Y1=max(Y1,y)
    if X1<X0: return None
    c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
    return (round(c0[0],2),round(c0[1],2),round(c1[0],2),round(c1[1],2))
creme = lambda c: c[0]>150 and c[1]>140 and c[2]>110 and abs(c[0]-c[2])<70
cyan  = lambda c: c[2]>120 and c[1]>110 and c[2]-c[0]>25
creme2= lambda c: 100<c[0]<215 and 90<c[1]<205 and c[2]<190 and c[0]-c[2]>15
for nom,S,i in (('REFERENCE rang3 "Blanchiment"',R,2),('JEU rang1 "Lt. Oster"',C,0)):
    top,bot=RANGS[S['nom']][i]
    print(f'\n===== {nom} — haut du rang y={top} CSS, bas {bot} (h={bot-top:.1f}) =====')
    def rel(b):
        return None if b is None else (round(b[0],2),round(b[1]-top,2),round(b[2],2),round(b[3]-top,2))
    med = bb(S,20,top+2,140,bot-2, lambda c: c[0]>120 and c[0]-c[2]>25)      # anneau laiton
    print(f'  medaillon (anneau laiton) bbox rel = {rel(med)}   diam {med[2]-med[0]:.2f} x {med[3]-med[1]:.2f}')
    nomb = bb(S,145,top+5,380,top+50, creme)
    print(f'  NOM   bbox rel = {rel(nomb)}  haut.capitale {nomb[3]-nomb[1]:.2f}  chasse {nomb[2]-nomb[0]:.2f}')
    pu = bb(S,145,top+45,380,bot-3, lambda c: c[2]>90 and c[2]-c[0]>18)
    print(f'  PUCE (contour+texte cyan) bbox rel = {rel(pu)}  h {pu[3]-pu[1]:.2f}  larg {pu[2]-pu[0]:.2f}')
    put = bb(S,155,top+45,380,bot-3, cyan)
    print(f'  texte de puce bbox rel = {rel(put)}  haut.capitale {put[3]-put[1]:.2f}')
    print(f'  ECART bas du NOM -> haut de la PUCE = {pu[1]-nomb[3]:.2f} CSS')
    ev = bb(S,380,top+5,545,top+55, creme)
    print(f'  ETAT valeur bbox rel = {rel(ev)}  haut.capitale {ev[3]-ev[1]:.2f}  chasse {ev[2]-ev[0]:.2f}  bord droit {ev[2]:.2f}')
    el = bb(S,380,top+52,545,bot-3, creme2)
    print(f'  ETAT libelle bbox rel = {rel(el)}  hauteur {el[3]-el[1]:.2f}  chasse {el[2]-el[0]:.2f}  bord droit {el[2]:.2f}')
