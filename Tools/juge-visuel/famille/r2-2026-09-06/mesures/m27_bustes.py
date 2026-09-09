# m27 — BUSTES : bbox de la silhouette (#cfc4a6) en % du DISQUE, des deux cotes.
# Le piege connu de ce depot est l'epaule tronquee : on mesure donc explicitement la LARGEUR
# de la silhouette a sa base (les epaules) et non seulement sa presence.
# CONTROLE : le disque lui-meme (anneau laiton) doit avoir le meme diametre des deux cotes (deja
# mesure en m10/m11) — on le recalcule ici pour que les % soient opposables.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
buste=lambda c: 150<c[0]<235 and 140<c[1]<225 and 110<c[2]<200 and c[0]-c[2]>18 and c[0]-c[1]<35
CAS={'REF':[('don',77.5,171.0,35.5),('lt rang1',100.8,302.8,35.5),('lt rang3',100.8,679.0,35.5)],
     'JEU':[('don',76.6,184.9,35.1),('lt rang1',100.5,314.0,35.4),('lt rang3',100.5,717.0,35.4)]}
for S in (R,C):
    print(f'\n===== {S["nom"]} =====')
    for nom,cx,cy,r in CAS[S['nom']]:
        im=S['im'].load()
        a=P(S,cx-r,cy-r); b=P(S,cx+r,cy+r)
        X0=Y0=10**9;X1=Y1=-10**9; n=0
        largeurs={}
        for y in range(int(a[1]),int(b[1])):
            xs=[x for x in range(int(a[0]),int(b[0])) if buste(im[x,y])]
            if xs:
                n+=len(xs); X0=min(X0,xs[0]);X1=max(X1,xs[-1]);Y0=min(Y0,y);Y1=max(Y1,y)
                largeurs[y]=(xs[0],xs[-1])
        if X1<X0: print(f'  {nom}: AUCUNE encre de buste'); continue
        c0=toCSS(S,X0,Y0);c1=toCSS(S,X1+1,Y1+1)
        px0=100*(c0[0]-(cx-r))/(2*r); px1=100*(c1[0]-(cx-r))/(2*r)
        py0=100*(c0[1]-(cy-r))/(2*r); py1=100*(c1[1]-(cy-r))/(2*r)
        # largeur a la base (3 dernieres lignes)
        ys=sorted(largeurs); base=largeurs[ys[-3]]
        lb=100*((base[1]-base[0]+1)/S['f'])/(2*r)
        # largeur au sommet (tete)
        tete=largeurs[ys[min(6,len(ys)-1)]]
        lt=100*((tete[1]-tete[0]+1)/S['f'])/(2*r)
        print(f'  {nom:9s} bbox en % du disque : x {px0:5.1f}..{px1:5.1f} · y {py0:5.1f}..{py1:5.1f}'
              f' | aire d\'encre {100*n/(3.1416*(r*S["f"])**2):5.1f} % du disque'
              f' | largeur a la BASE {lb:5.1f} % · a la TETE {lt:5.1f} %')
