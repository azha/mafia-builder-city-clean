#!/usr/bin/env python3
"""m15a - reperage des LIGNES DE TEXTE (bandes encrees) avant toute mesure de hauteur de capitale.
On imprime, pour chaque zone, les plages de lignes portant de l'encre et leur etendue en x.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

def bandes(im,x0,x1,y0,y1,pred,label,minpx=3):
    px=im.load(); runs=[];cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if pred(px[x,y])]
        if len(xs)>=minpx:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur: runs.append(tuple(cur)); cur=None
    if cur: runs.append(tuple(cur))
    print(f"[{label}] x={x0}..{x1} y={y0}..{y1} :")
    for a,b,xa,xb in runs:
        print(f"    ligne y={a:5d}..{b:5d} (h={b-a+1:3d})  x={xa:4d}..{xb:4d} (l={xb-xa+1:4d})")
    return runs

print("\n=== REF : interieur de la carte (encre SOMBRE sur creme) ===")
bandes(ref,110,700,860,1500,lambda p: L(p)<120,'REF carte')
print("\n=== CAP : interieur de la carte (encre CLAIRE sur noir) ===")
bandes(cap,60,680,1290,1680,lambda p: L(p)>70,'CAP carte')
print("\n=== REF : CTA primaire (encre sombre sur creme) ===")
bandes(ref,60,1030,1810,2060,lambda p: L(p)<130,'REF cta1')
print("\n=== CAP : CTA primaire (encre claire sur noir) ===")
bandes(cap,60,1030,1935,2130,lambda p: L(p)>60,'CAP cta1')
print("\n=== REF : CTA secondaire (encre claire sur panneau sombre) ===")
bandes(ref,60,1030,1550,1700,lambda p: L(p)>90,'REF cta2')
print("\n=== CAP : CTA secondaire ===")
bandes(cap,60,1030,1700,1810,lambda p: L(p)>60,'CAP cta2')
