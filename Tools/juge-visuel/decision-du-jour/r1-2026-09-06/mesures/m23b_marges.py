#!/usr/bin/env python3
"""m23b - MARGES, mesure corrigee : en (b) de m23 le balayage x=0..900 attrapait le MEDAILLON
(x=841..984 en capture) et rendait donc une 'carte' de 865 px. On borne ici la carte a son cadre,
mesure independamment (m10 : bord or x=35..699 en capture ; carte creme en reference).
Controle positif : la largeur retenue doit coincider avec celle de m10 (665 px en capture).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def bord(im,y,x0,x1,seuil,label):
    px=im.load(); xs=[x for x in range(x0,x1) if L(px[x,y])>seuil]
    print(f"   [{label}] y={y} : gauche x={min(xs)} droite x={max(xs)} largeur={max(xs)-min(xs)+1}")
    return min(xs),max(xs)
print("\n-- carte, a mi-hauteur, balayage BORNE au conteneur de la carte --")
gr,dr=bord(ref,1151,0,790,140,'REF carte')          # 790 : avant le medaillon (x>=803)
gc,dc=bord(cap,1482,0,780,35,'CAP carte')           # 780 : avant le medaillon (x>=841)
print(f"   CONTROLE POSITIF largeur CAP = {dc-gc+1} px, m10 (bord or) donnait 665 -> "
      f"{'OK' if abs((dc-gc+1)-665)<=2 else 'ECART'}")
print(f"   marge gauche  REF={gr}px ({gr/3.6:.1f} CSS)  CAP={gc}px ({gc/3.6:.1f} CSS)  ecart={gc-gr:+d} px")
print(f"   marge droite  REF={1080-dr}px  CAP={1080-dc}px  ecart={(1080-dc)-(1080-dr):+d} px")
print(f"   largeur carte REF={dr-gr+1}  CAP={dc-gc+1}  ecart={(dc-gc)-(dr-gr):+d} px "
      f"({((dc-gc+1)/(dr-gr+1)-1)*100:+.1f}%)")
print("\n-- hauteur de la carte (m10) : REF 773 px, CAP 410 px --")
print(f"   rapport d'aspect L/H : REF {628/773:.3f} (portrait)  CAP {665/410:.3f} (paysage)")
print(f"   hauteur : {(410/773-1)*100:+.1f}%")
print("\n-- medaillon : position --")
print("   REF x=803..946 (m11/m12c)   CAP x=841..983 (m12c)")
print(f"   decalage du centre = {(841+983)//2 - (803+946)//2:+d} px vers la droite")
