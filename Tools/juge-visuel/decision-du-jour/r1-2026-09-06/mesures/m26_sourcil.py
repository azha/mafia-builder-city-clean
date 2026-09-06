#!/usr/bin/env python3
"""m26 - INTERLETTRAGE du sourcil, mesure refaite. Le chiffre de m20 (l/hcap 18,75 vs 18,90)
etait DOUBLEMENT contamine et n'est pas recevable : (a) le balayage x=120..900 avec le predicat
'sombre' attrapait l'ART PEINT au-dela du bord droit de la carte (x=732) et rendait une largeur de
750 px ; (b) la hauteur incluait l'accent de 'PESE' et l'apostrophe. On borne ici a l'interieur de
la carte et on reprend les hauteurs de capitale corrigees de m21 (16 px / 21 px).
Controle positif : la largeur trouvee doit tomber DANS la carte (x < 732 en reference).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def etendue(im,x0,x1,y0,y1,pred,label):
    px=im.load(); xs=[x for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    print(f"[{label}] x={min(xs)}..{max(xs)}  largeur={max(xs)-min(xs)+1} px")
    return min(xs),max(xs)
# reference : sourcil dans la carte, x borne a 700 (bord droit de la carte a 732)
a,b=etendue(ref,120,700,915,940,lambda p:L(p)<150,'REF sourcil')
print(f"   CONTROLE POSITIF le sourcil reste dans la carte (bord droit x=732) : x_max={b} -> {'OK' if b<732 else 'ECHEC'}")
c,d=etendue(cap,60,760,1385,1415,lambda p:L(p)>70,'CAP sourcil')
lr,lc=b-a+1,d-c+1
hr,hc=16,21   # hauteurs de capitale corrigees, m21 (le 'C' initial, sans accent)
print(f"\n   REF : largeur {lr} px, hauteur de capitale {hr} px -> l/hcap = {lr/hr:.2f}")
print(f"   CAP : largeur {lc} px, hauteur de capitale {hc} px -> l/hcap = {lc/hc:.2f}")
print(f"   ecart de largeur           = {lc-lr:+d} px ({(lc/lr-1)*100:+.1f}%)")
print(f"   ecart de hauteur de cap.   = {hc-hr:+d} px ({(hc/hr-1)*100:+.1f}%)")
print(f"   ecart de CHASSE a hauteur egale (l/hcap) = {(lc/hc)/(lr/hr)-1:+.1%}")
print("\n   Lecture : la meme chaine, en capitales des deux cotes. Si l/hcap differe nettement,")
print("   l'interlettrage a change ; s'il est proche, seule la TAILLE a change.")
