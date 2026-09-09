# m25 — CASSE, v2 : segmentation en LETTRES (colonnes d'encre separees par >=0,8 CSS de vide),
# puis hauteur d'encre de chaque lettre. Un mot tout en capitales : toutes les lettres a la meme
# hauteur (a l'accent pres). Un mot en casse mixte : au moins une lettre a <=75 % de la plus haute.
# CONTROLE POSITIF (doit dire CAPITALES des deux cotes) : sous-titre "3 LIEUTENANTS", texte de puce.
# CONTROLE NEGATIF (doit dire MIXTE des deux cotes)    : nom de rang, texte de boite vide.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def lettres(S,x0,y0,x1,y1,test):
    im=S['im'].load(); a=P(S,x0,y0); b=P(S,x1,y1)
    col=[]
    for x in range(int(a[0]),int(b[0])):
        ys=[y for y in range(int(a[1]),int(b[1])) if test(im[x,y])]
        col.append((x,ys))
    segs=[];cur=[]
    vide=0
    for x,ys in col:
        if ys: cur.append((x,ys)); vide=0
        else:
            vide+=1
            if cur and vide>=max(1,int(0.8*S['f'])): segs.append(cur); cur=[]
    if cur: segs.append(cur)
    out=[]
    for s in segs:
        if len(s)<int(1.2*S['f']): continue
        top=min(min(ys) for x,ys in s); bot=max(max(ys) for x,ys in s)
        out.append(round((bot-top+1)/S['f'],2))
    return out
def juge(S,nom,x0,y0,x1,y1,test):
    h=lettres(S,x0,y0,x1,y1,test)
    if not h: print(f'  {S["nom"]} {nom:26s} : aucune lettre isolee'); return
    hmax=max(h); pet=[v for v in h if v<0.78*hmax]
    print(f'  {S["nom"]} {nom:26s} : {len(h)} lettres, hauteurs {h} · max {hmax:.2f} · lettres <78 % du max : {len(pet)}'
          f'  => {"CASSE MIXTE" if pet else "CAPITALES"}')
creme=lambda c: c[0]>165 and c[1]>150 and c[2]>120
cr2  =lambda c: c[0]>135 and c[1]>120 and 5<c[0]-c[2]<75
cy   =lambda c: c[2]>140 and c[2]-c[0]>40
print('\n=== CONTROLE POSITIF (attendu : CAPITALES des deux cotes) ===')
juge(R,'sous-titre',100,76,255,95,cr2); juge(C,'sous-titre',100,70,265,90,cr2)
juge(R,'texte de puce',164,684,240,706,cy); juge(C,'texte de puce',164,320,238,342,cy)
print('\n=== CONTROLE NEGATIF (attendu : CASSE MIXTE des deux cotes) ===')
juge(R,'nom de rang',152,653,285,682,creme); juge(C,'nom de rang',152,287,258,314,creme)
juge(R,'texte de boite vide',195,392,440,420,cr2); juge(C,'texte de boite vide',183,402,452,432,cr2)
print('\n=== SUJET : libelle d\'etat ===')
juge(R,'libelle d\'etat',468,682,525,706,cr2); juge(C,'libelle d\'etat',468,311,525,338,cr2)
print('\n=== SUJET : valeur d\'etat ===')
juge(R,'valeur d\'etat',465,658,527,682,creme); juge(C,'valeur d\'etat',412,294,525,320,creme)
print('\n=== SUJET : rang du Don, fente du NOM et fente du ROLE ===')
orvif=lambda c: c[0]>170 and c[0]-c[2]>60
juge(R,'don : NOM',128,163,210,186,orvif); juge(C,'don : NOM',128,176,208,200,orvif)
juge(R,'don : ROLE',128,199,185,215,cr2);  juge(C,'don : ROLE',128,207,208,224,cr2)
