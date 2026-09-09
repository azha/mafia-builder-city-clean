#!/usr/bin/env python3
"""m24 - BOITE DE LA CARTE, sans borne artificielle. m10 bornait la recherche a x<700 et
rendait donc 665 px de large ; le bord or reel est a x=751 (sonde directe). Recalcul complet.
Controle positif : la largeur trouvee doit coincider avec la mesure a mi-hauteur de m23b (717 px).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def est_or(p): return p[0]>80 and p[0]>1.5*p[2] and 0.5*p[0]<p[1]<0.95*p[0]
px=cap.load(); xs=[];ys=[]
for y in range(1240,1740):
    for x in range(0,830):          # 830 : avant le medaillon (x>=841)
        if est_or(px[x,y]): xs.append(x); ys.append(y)
bb=(min(xs),min(ys),max(xs),max(ys)); Lw,Hh=bb[2]-bb[0]+1,bb[3]-bb[1]+1
print(f"[CAP] cadre or de la carte : x={bb[0]}..{bb[2]} y={bb[1]}..{bb[3]}  L={Lw} H={Hh}")
print(f"   CONTROLE POSITIF vs m23b (717 px a mi-hauteur) : {Lw} -> {'OK' if abs(Lw-717)<=2 else 'ECART'}")
# reference : carte creme, sans borne
pr=ref.load(); xs=[];ys=[]
def creme(p): return L(p)>150 and p[0]>p[2] and abs(p[0]-p[1])<40
for y in range(740,1570):
    for x in range(0,790):
        if creme(pr[x,y]): xs.append(x); ys.append(y)
bbr=(min(xs),min(ys),max(xs),max(ys)); Lr,Hr=bbr[2]-bbr[0]+1,bbr[3]-bbr[1]+1
print(f"[REF] carte creme : x={bbr[0]}..{bbr[2]} y={bbr[1]}..{bbr[3]}  L={Lr} H={Hr} (bbox, carte inclinee de 2 deg)")
print(f"\n  LARGEUR : REF {Lr} -> CAP {Lw}  ({(Lw/Lr-1)*100:+.1f}%)")
print(f"  HAUTEUR : REF {Hr} -> CAP {Hh}  ({(Hh/Hr-1)*100:+.1f}%)")
print(f"  ASPECT L/H : REF {Lr/Hr:.3f} (portrait)  CAP {Lw/Hh:.3f} (paysage)  -> facteur {(Lw/Hh)/(Lr/Hr):.2f}x")
print(f"  AIRE : REF {Lr*Hr} px2  CAP {Lw*Hh} px2  ({(Lw*Hh)/(Lr*Hr)-1:+.1%})")
print(f"  marge gauche REF {bbr[0]} px / CAP {bb[0]} px ; marge droite REF {1080-bbr[2]} / CAP {1080-bb[2]}")
