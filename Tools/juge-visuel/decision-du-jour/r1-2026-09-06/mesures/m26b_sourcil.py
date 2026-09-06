#!/usr/bin/env python3
"""m26b - INTERLETTRAGE du sourcil, 3e version. m26 bornait a x<700 en reference : or le FILET
ROUGE INTERIEUR de la carte est a x=696..698, de la meme brique (147,64,44) que le texte, et il
etait compte comme la derniere lettre (largeur 549 au lieu de 494). Ici on rejette toute colonne
encree sur > 20 des 26 lignes de la bande : une lettre n'occupe jamais toute la hauteur.
Controle positif : le nombre de colonnes rejetees doit etre petit (le filet, pas le texte).
Controle negatif : la meme regle appliquee a la capture ne doit rien rejeter (pas de filet la-bas).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def texte(im,x0,x1,y0,y1,pred,label):
    px=im.load(); H=y1-y0; gard=[]; rej=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1) if pred(px[x,y]))
        if n==0: continue
        (rej if n>0.77*H else gard).append(x)
    print(f"[{label}] colonnes de texte x={min(gard)}..{max(gard)} largeur={max(gard)-min(gard)+1} px"
          f" | colonnes REJETEES (pleine hauteur = filet, pas lettre) : {rej}")
    return min(gard),max(gard)
a,b=texte(ref,120,740,915,941,lambda p:L(p)<150,'REF sourcil')
c,d=texte(cap,60,740,1385,1416,lambda p:L(p)>70,'CAP sourcil')
lr,lc=b-a+1,d-c+1; hr,hc=16,21
print(f"\n   REF : l={lr} px  hcap={hr} px  -> l/hcap = {lr/hr:.2f}")
print(f"   CAP : l={lc} px  hcap={hc} px  -> l/hcap = {lc/hc:.2f}")
print(f"   ecart de largeur                        = {lc-lr:+d} px ({(lc/lr-1)*100:+.1f}%)")
print(f"   ecart de hauteur de capitale            = {hc-hr:+d} px ({(hc/hr-1)*100:+.1f}%)")
print(f"   ecart de CHASSE a hauteur egale (l/hcap)= {((lc/hc)/(lr/hr)-1)*100:+.1f}%")
