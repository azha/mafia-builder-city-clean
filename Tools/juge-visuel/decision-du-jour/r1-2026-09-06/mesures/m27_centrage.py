#!/usr/bin/env python3
"""m27 - CENTRAGE HORIZONTAL du titre du CTA primaire — remplace le controle positif C15, qui etait
FAUX : il derivait des largeurs et hauteurs contaminees de m20 et annoncait un interlettrage egal
(+0,8 %) alors que la mesure propre (m26) rend -18,7 %.
Controle positif : les deux titres doivent etre centres sur l'ecran (centre theorique 540 px).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def centre(im,x0,x1,y0,y1,pred,label):
    px=im.load(); xs=[x for y in range(y0,y1) for x in range(x0,x1) if pred(px[x,y])]
    a,b=min(xs),max(xs); c=(a+b)/2
    print(f"[{label}] x={a}..{b}  centre={c:.1f}  ecart au centre d'ecran (540) = {c-540:+.1f} px")
    return c
cr=centre(ref,60,1030,1865,1900,lambda p:L(p)<130,'REF titre CTA1')
cc=centre(cap,60,1030,1973,2008,lambda p:L(p)>60,'CAP titre CTA1')
print(f"   CONTROLE POSITIF les deux sont centres (|ecart| <= 5 px) : "
      f"REF {abs(cr-540):.1f}  CAP {abs(cc-540):.1f} -> {'OK' if max(abs(cr-540),abs(cc-540))<=5 else 'ECHEC'}")
print(f"   ecart de centrage entre les deux = {cc-cr:+.1f} px")
