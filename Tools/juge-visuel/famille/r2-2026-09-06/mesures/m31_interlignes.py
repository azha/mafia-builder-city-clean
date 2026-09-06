# m31 — INTERLIGNES des blocs a deux lignes, mesures sur la LIGNE DE BASE (bas des lettres SANS
# jambage descendant) et le SOMMET de la ligne suivante — pas sur des bbox brutes, qui melangent
# accents et descendantes.
# Controle : la hauteur de capitale des lignes comparees doit etre egale des deux cotes (sinon on
# compare des corps de texte differents et l'ecart d'interligne n'est pas opposable).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def lettres(S,x0,y0,x1,y1,test):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    col=[(x,[y for y in range(int(a[1]),int(b[1])) if test(im[x,y])]) for x in range(int(a[0]),int(b[0]))]
    segs=[];cur=[];vide=0
    for x,ys in col:
        if ys: cur.append((x,ys)); vide=0
        else:
            vide+=1
            if cur and vide>=max(1,int(0.8*S['f'])): segs.append(cur); cur=[]
    if cur: segs.append(cur)
    out=[]
    for s in segs:
        if len(s)<int(1.2*S['f']): continue
        rows=sorted({y for x,ys in s for y in ys})
        blocs=[];cur2=[rows[0]]
        for r in rows[1:]:
            if r-cur2[-1]>max(1,int(1.0*S['f'])): blocs.append(cur2); cur2=[r]
            else: cur2.append(r)
        blocs.append(cur2)
        b2=max(blocs,key=lambda B:B[-1])
        out.append((toCSS(S,0,b2[0])[1], toCSS(S,0,b2[-1]+1)[1]))
    return out
creme=lambda c: c[0]>165 and c[1]>150 and c[2]>120
cr2  =lambda c: 135<c[0]<215 and c[1]>120 and 5<c[0]-c[2]<75   # creme-2 SEUL : borne haute pour exclure le creme (234,224,200)
cy   =lambda c: c[2]>140 and c[2]-c[0]>40
orvif=lambda c: c[0]>170 and c[0]-c[2]>60
def bloc(S,nom,top, l1, l2, t1, t2):
    a=lettres(S,l1[0],l1[1],l1[2],l1[3],t1); b=lettres(S,l2[0],l2[1],l2[2],l2[3],t2)
    if not a or not b: print(f'  {S["nom"]} {nom}: incomplet'); return
    # ligne de base = mediane des bas (les descendantes sont minoritaires -> on prend la mediane)
    bas=sorted(v[1] for v in a); base=bas[len(bas)//2]
    haut=min(v[0] for v in b)
    hcap=max(v[1]-v[0] for v in a)
    print(f'  {S["nom"]} {nom:24s} ligne1 base {base-top:6.2f} (h.cap max {hcap:5.2f}) · ligne2 sommet {haut-top:6.2f} · INTERLIGNE {haut-base:5.2f} CSS')
    return haut-base
print('\n=== bloc "qui" du rang (nom -> puce) ===')
a=bloc(R,'REF rang3',629.5,(152,653,285,682),(153,681,255,702),creme,cy)
b=bloc(C,'JEU rang1',264.3,(152,287,258,314),(153,317,250,342),creme,cy)
print(f'   -> ecart {b-a:+.2f} CSS ({100*(b-a)/a:+.0f} %)')
print('\n=== bloc "etat" du rang (valeur -> libelle) ===')
a=bloc(R,'REF rang3',629.5,(462,658,527,684),(468,683,527,703),creme,cr2)
b=bloc(C,'JEU rang1',264.3,(410,294,527,320),(468,314,527,336),creme,cr2)
print(f'   -> ecart {b-a:+.2f} CSS ({100*(b-a)/a:+.0f} %)')
print('\n=== bloc du rang du Don (nom -> role) ===')
a=bloc(R,'REF don',136.0,(128,163,210,187),(128,198,190,216),orvif,cr2)
b=bloc(C,'JEU don',150.0,(128,176,208,200),(128,206,210,224),orvif,cr2)
print(f'   -> ecart {b-a:+.2f} CSS ({100*(b-a)/a:+.0f} %)')
print('\n=== bloc de tete (titre -> sous-titre) ===')
a=bloc(R,'REF tete',0.0,(98,34,310,60),(98,75,260,95),orvif,cr2)
b=bloc(C,'JEU tete',0.0,(98,30,315,55),(98,69,270,90),orvif,cr2)
print(f'   -> ecart {b-a:+.2f} CSS ({100*(b-a)/a:+.0f} %)')
