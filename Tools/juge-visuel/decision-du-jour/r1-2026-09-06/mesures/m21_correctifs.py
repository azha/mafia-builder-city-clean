#!/usr/bin/env python3
"""m21 - deux mesures reprises de m20, dont les instruments etaient contamines :
 (a) hauteur de capitale du sourcil : m20 englobait l'ACCENT de 'PESE' et l'apostrophe -> on
     mesure ici le seul 'C' initial, sans accent ni jambage, des deux cotes ;
 (c) filet separateur : m20 rendait 21,8% (predicat trop grossier) -> on mesure ici le trait par
     son ECART A LA MEDIANE DE LA COLONNE, ce qui trouve un filet meme tres pale.
Controle positif (c) : le trait de la reference doit couvrir > 90% de la largeur utile.
"""
from PIL import Image
import os, statistics
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

print("\n(a) hauteur de capitale : le 'C' initial de 'CE QUI PESE...' (pas d'accent, pas de jambage)")
def c_initial(im,x0,x1,y0,y1,pred,label):
    px=im.load()
    # colonne de depart du texte
    cols=[x for x in range(x0,x1) if any(pred(px[x,y]) for y in range(y0,y1))]
    xa=min(cols)
    # le C fait ~ 0,8 x hauteur ; on prend les 30 premieres colonnes
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(xa,xa+28):
            if pred(px[x,y]): xs.append(x);ys.append(y)
    h=max(ys)-min(ys)+1
    print(f"[{label}] 'C' x={xa}..{xa+27} -> encre y={min(ys)}..{max(ys)}  HAUTEUR DE CAPITALE={h} px ({h/3.6:.2f} CSS)")
    return h
hr=c_initial(ref,120,900,895,945,lambda p:L(p)<150,'REF')
hc=c_initial(cap,60,700,1378,1420,lambda p:L(p)>70,'CAP')
print(f"   ecart CAP-REF = {hc-hr:+d} px ({(hc-hr)/hr*100:+.1f}%)  [tolerance du mandat : <=1px ou <=5%]")

print("\n   idem pour le 'L' de 'LES LIRE MAINTENANT' (CTA primaire)")
lr=c_initial(ref,190,900,1860,1905,lambda p:L(p)<160,'REF')
lc=c_initial(cap,180,900,1968,2012,lambda p:L(p)>60,'CAP')
print(f"   ecart CAP-REF = {lc-lr:+d} px ({(lc-lr)/lr*100:+.1f}%)")

print("\n(c) FILET SEPARATEUR dans la carte — ecart a la mediane de la colonne")
def trait(im,x0,x1,y0,y1,label,sens):
    px=im.load(); res=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            v=L(px[x,y])
            voisins=statistics.median([L(px[x,yy]) for yy in (y-6,y-5,y+5,y+6)])
            if (sens<0 and v<voisins-4) or (sens>0 and v>voisins+4): n+=1
        res.append((y,n))
    y,n=max(res,key=lambda t:t[1])
    print(f"[{label}] meilleure ligne y={y} : {n}/{x1-x0} colonnes = {n/(x1-x0)*100:.1f}%")
    return n/(x1-x0)*100
a=trait(ref,170,640,1290,1340,'REF (trait plus sombre que la creme)',-1)
b=trait(cap,90,620,1540,1575,'CAP (trait plus clair que le noir)',+1)
print(f"   CONTROLE POSITIF REF > 90% : {a:.1f}% -> {'OK' if a>90 else 'ECHEC'}")
print(f"   CAP : {b:.1f}%  -> {'FILET ABSENT' if b<10 else 'filet present'}")
