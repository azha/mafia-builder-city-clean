#!/usr/bin/env python3
"""m26d - INTERLETTRAGE du sourcil, version RETENUE (4e). Historique des refutations :
  m20  : l=750 (le predicat attrapait l'ART PEINT hors carte) + hcap avec accent -> '+0,8 %' FAUX
  m26  : borne x<700 -> attrapait le FILET ROUGE INTERIEUR (x=696..698) -> l=549, '-18,7 %' FAUX
  m26b : rejet des colonnes pleine hauteur -> reste la frange du filet -> l=546, '-18,2 %' FAUX
  m26c : segmentation par blanc de 15 px -> coupe entre les MOTS (chaine espacee) -> inexploitable
  m26d : segmentation, puis on garde du 1er groupe au dernier groupe QUI N'EST PAS pleine hauteur.
Controle positif : la largeur doit tomber a +-6 px de la lecture du crop (REF 150..~658).
Controle negatif : le groupe du filet (pleine hauteur) doit etre ecarte.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def mots(im,x0,x1,y0,y1,pred,label):
    px=im.load(); H=y1-y0
    enc=[(x,sum(1 for y in range(y0,y1) if pred(px[x,y]))) for x in range(x0,x1)]
    enc=[(x,n) for x,n in enc if n>0]
    grp=[]; cur=[enc[0]]
    for x,n in enc[1:]:
        if x-cur[-1][0]<=15: cur.append((x,n))
        else: grp.append(cur); cur=[(x,n)]
    grp.append(cur)
    txt=[g for g in grp if not all(n>0.77*H for _,n in g)]
    rej=[(g[0][0],g[-1][0]) for g in grp if g not in txt]
    a,b=txt[0][0][0], txt[-1][-1][0]
    print(f"[{label}] {len(grp)} groupes ; ecartes (pleine hauteur = filet) : {rej}")
    print(f"   -> texte x={a}..{b}  largeur={b-a+1} px")
    return a,b
ar,br=mots(ref,120,745,915,941,lambda p:L(p)<150,'REF sourcil')
ac,bc=mots(cap,60,740,1385,1416,lambda p:L(p)>70,'CAP sourcil')
print(f"   CONTROLE POSITIF REF ~ 150..658 (crop) : {ar}..{br} -> {'OK' if abs(ar-150)<=3 and abs(br-658)<=16 else 'ECART'}")
print(f"   CONTROLE NEGATIF filet ecarte : {'OK' if br<690 else 'ECHEC'}")
lr,lc=br-ar+1, bc-ac+1; hr,hc=16,21
print(f"\n   REF : l={lr} px  hcap={hr} px -> l/hcap = {lr/hr:.2f}")
print(f"   CAP : l={lc} px  hcap={hc} px -> l/hcap = {lc/hc:.2f}")
t=((lc/hc)/(lr/hr)-1)*100
print(f"   CHASSE a hauteur de capitale egale : {t:+.1f} %")
print(f"   Tolerance du mandat pour un espacement : <= 10 % de la valeur")
print(f"   => {'DANS la tolerance : ce N EST PAS un ecart' if abs(t)<=10 else 'HORS tolerance : ecart'}")
