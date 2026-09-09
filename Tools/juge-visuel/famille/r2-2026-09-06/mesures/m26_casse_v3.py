# m26 — CASSE, v3 : par lettre, on isole le CORPS (on retire le blob d'accent separe par un vide
# vertical) puis on compare les hauteurs de corps.  Un mot en capitales : tous les corps egaux.
# CONTROLE POSITIF (doit dire CAPITALES) : sous-titre "3 LIEUTENANTS" · puce "DELEGUE"/"RECENT"
#   (accentues des deux cotes -> c'est le test du traitement de l'accent) · role du Don.
# CONTROLE NEGATIF (doit dire MIXTE)     : nom de rang · texte de boite vide.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def corps(S,x0,y0,x1,y1,test):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    col=[]
    for x in range(int(a[0]),int(b[0])):
        col.append((x,[y for y in range(int(a[1]),int(b[1])) if test(im[x,y])]))
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
        # decouper en blocs verticaux (vide >= 1 CSS)
        blocs=[];cur2=[rows[0]]
        for r in rows[1:]:
            if r-cur2[-1]>max(1,int(1.0*S['f'])): blocs.append(cur2); cur2=[r]
            else: cur2.append(r)
        blocs.append(cur2)
        b2=max(blocs,key=lambda B:B[-1])   # le bloc le plus BAS = le corps
        out.append(round((b2[-1]-b2[0]+1)/S['f'],2))
    return out
def juge(S,nom,x0,y0,x1,y1,test,attendu=None):
    h=corps(S,x0,y0,x1,y1,test)
    if not h: print(f'  {S["nom"]} {nom:24s} : rien'); return
    hmax=max(h); pet=[v for v in h if v<0.80*hmax]
    verdict='CASSE MIXTE' if pet else 'CAPITALES'
    ok='' if attendu is None else ('  OK' if verdict==attendu else '  *** L\'INSTRUMENT RATE SON CONTROLE ***')
    print(f'  {S["nom"]} {nom:24s} : corps {h} · max {hmax:.2f} · <80 % : {len(pet)} => {verdict}{ok}')
creme=lambda c: c[0]>165 and c[1]>150 and c[2]>120
cr2  =lambda c: c[0]>135 and c[1]>120 and 5<c[0]-c[2]<75
cy   =lambda c: c[2]>140 and c[2]-c[0]>40
orvif=lambda c: c[0]>170 and c[0]-c[2]>60
print('\n=== CONTROLES POSITIFS (attendu CAPITALES) ===')
juge(R,'sous-titre',100,76,255,95,cr2,'CAPITALES');        juge(C,'sous-titre',100,70,265,90,cr2,'CAPITALES')
juge(R,'puce "DELEGUE"',164,684,240,704,cy,'CAPITALES');   juge(C,'puce "RECENT"',164,321,238,340,cy,'CAPITALES')
juge(R,'role du Don',128,199,185,215,cr2,'CAPITALES');     juge(C,'role du Don',128,207,208,224,cr2,'CAPITALES')
print('\n=== CONTROLES NEGATIFS (attendu CASSE MIXTE) ===')
juge(R,'nom de rang',152,653,285,680,creme,'CASSE MIXTE'); juge(C,'nom de rang',152,287,258,308,creme,'CASSE MIXTE')
juge(R,'boite vide',195,392,440,418,cr2,'CASSE MIXTE');    juge(C,'boite vide',183,403,452,429,cr2,'CASSE MIXTE')
print('\n=== SUJET 1 : libelle d\'etat ===')
juge(R,'libelle d\'etat',468,683,525,701,cr2);              juge(C,'libelle d\'etat',468,315.0,525,334.5,cr2)
print('\n=== SUJET 2 : fente du NOM du rang du Don ===')
juge(R,'don : NOM',128,163,210,185,orvif);                  juge(C,'don : NOM',128,177,208,198,orvif)
