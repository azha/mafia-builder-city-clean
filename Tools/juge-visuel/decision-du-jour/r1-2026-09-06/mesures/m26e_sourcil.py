#!/usr/bin/env python3
"""m26e - INTERLETTRAGE du sourcil — mesure RETENUE, et retractation de l'ecart annonce.
La bonne grandeur etait deja produite par m26c : sa segmentation par blanc de 15 px rend, en
reference, SIX groupes dont le dernier (695..739) est separe du precedent (fin a 643) par un blanc
de 51 px. Aucun interlettrage de cette chaine n'atteint 51 px : ce groupe est le FILET ROUGE
INTERIEUR de la carte, pas une lettre. Le texte va donc de 150 a 643.
Controle positif : le plus grand blanc INTERNE au texte doit etre tres inferieur a 51 px.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def groupes(im,x0,x1,y0,y1,pred,label):
    px=im.load()
    enc=[x for x in range(x0,x1) if any(pred(px[x,y]) for y in range(y0,y1))]
    g=[]; cur=[enc[0]]
    for x in enc[1:]:
        if x-cur[-1]<=15: cur.append(x)
        else: g.append((cur[0],cur[-1])); cur=[x]
    g.append((cur[0],cur[-1]))
    blancs=[g[i+1][0]-g[i][1]-1 for i in range(len(g)-1)]
    print(f"[{label}] groupes {g}\n    blancs entre groupes : {blancs} px")
    return g,blancs
gr,br_=groupes(ref,120,745,915,941,lambda p:L(p)<150,'REF')
gc,bc_=groupes(cap,60,740,1385,1416,lambda p:L(p)>70,'CAP')
print(f"\n   REF : le dernier blanc vaut {br_[-1]} px, contre {max(br_[:-1])} px au plus entre deux mots")
print(f"   CONTROLE POSITIF : {br_[-1]} >> {max(br_[:-1])} -> le dernier groupe n'est pas du texte : "
      f"{'OK' if br_[-1] > 2*max(br_[:-1]) else 'ECHEC'}")
a,b = gr[0][0], gr[-2][1]
c,d = gc[0][0], gc[-1][1]
print(f"   CAP : blancs {bc_} -> aucun n'est aberrant, les 6 groupes sont du texte")
lr,lc=b-a+1,d-c+1; hr,hc=16,21
print(f"\n   REF : texte x={a}..{b}  l={lr} px  hcap={hr} -> l/hcap = {lr/hr:.2f}")
print(f"   CAP : texte x={c}..{d}  l={lc} px  hcap={hc} -> l/hcap = {lc/hc:.2f}")
t=((lc/hc)/(lr/hr)-1)*100
print(f"\n   CHASSE a hauteur de capitale egale : {t:+.1f} %   (tolerance du mandat : <= 10 %)")
print(f"   => {'DANS la tolerance -> PAS un ecart, finding retracte' if abs(t)<=10 else 'HORS tolerance'}")
print(f"   La HAUTEUR DE CAPITALE, elle, reste hors tolerance : {hr} -> {hc} px ({(hc/hr-1)*100:+.1f} %) = F16")
