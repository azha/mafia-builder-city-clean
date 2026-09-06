#!/usr/bin/env python3
"""m15 - HAUTEUR DE CAPITALE des textes principaux (ce que l'oeil voit), mesuree sur l'ENCRE :
dans une fenetre serree sur UNE lettre capitale sans jambage ni accent, on compte les lignes encrees.
Controle positif : la fenetre doit contenir de l'encre sur >=6 lignes (sinon elle rate la lettre).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def hcap(im,x0,x1,y0,y1,sombre_sur_clair,seuil,label,quoi):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            l=L(px[x,y])
            if (sombre_sur_clair and l<seuil) or ((not sombre_sur_clair) and l>seuil): n+=1
        if n>0: ys.append(y)
    if not ys or len(ys)<6:
        print(f"[{label}] {quoi}: CONTROLE ECHEC — {len(ys)} lignes encrees dans la fenetre"); return None
    h=max(ys)-min(ys)+1
    print(f"[{label}] {quoi}: fenetre x={x0}..{x1} y={y0}..{y1} -> encre y={min(ys)}..{max(ys)}  "
          f"HAUTEUR DE CAPITALE = {h} px  ({h/3.6:.1f} CSS)")
    return h

print("\n-- sourcil 'CE QUI PESE LE PLUS AUJOURD'HUI' (le C initial) --")
a=hcap(ref,148,178,890,935,True,120,'REF',"C de CE")
b=hcap(cap,66,96,1150,1190,False,80,'CAP',"C de CE")
print(f"   ecart CAP-REF = {b-a:+d} px ({(b-a)/a*100:+.1f}%)")

print("\n-- titre de la carte (1re capitale) --")
c=hcap(ref,248,300,975,1035,True,110,'REF',"D de Des")
d=hcap(cap,66,120,1190,1250,False,90,'CAP',"A de AUTONOMY")
print(f"   ecart CAP-REF = {d-c:+d} px ({(d-c)/c*100:+.1f}%)")

print("\n-- CTA primaire 'LES LIRE MAINTENANT' (le L initial) --")
e=hcap(ref,205,240,1870,1930,True,150,'REF',"L de LES")
f=hcap(cap,190,225,1970,2030,False,80,'CAP',"L de LES")
print(f"   ecart CAP-REF = {f-e:+d} px ({(f-e)/e*100:+.1f}%)")

print("\n-- CTA secondaire 'LAISSER SUR LE ZINC' / 'Laisser sur le zinc' (le L initial) --")
g=hcap(ref,325,360,1650,1700,False,90,'REF',"L de LAISSER")
h=hcap(cap,370,405,1780,1830,False,70,'CAP',"L de Laisser")
print(f"   ecart CAP-REF = {h-g:+d} px ({(h-g)/g*100:+.1f}%)")
