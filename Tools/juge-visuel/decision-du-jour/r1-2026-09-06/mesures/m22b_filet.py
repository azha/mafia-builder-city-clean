#!/usr/bin/env python3
"""m22b - FILET SEPARATEUR : preuve directe. Sur une fenetre etroite (100 px, ou la derive due a
l'inclinaison de 2 deg vaut 3,5 px), on imprime la luminance MOYENNE de chaque ligne. Un filet
apparait comme un creux net ; son absence, comme un plateau.
Controle : la creme nue voisine doit etre plate (ecart-type < 1,5).
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")
def profil(im,x0,x1,y0,y1,label):
    px=im.load(); out=[]
    print(f"[{label}] fenetre x={x0}..{x1}")
    for y in range(y0,y1):
        m=statistics.mean(L(px[x,y]) for x in range(x0,x1)); out.append((y,m))
    base=statistics.median(v for _,v in out)
    for y,m in out:
        mark='  <<< CREUX' if m<base-3 else ('  <<< PIC' if m>base+3 else '')
        print(f"    y={y}  lum_moy={m:7.2f}{mark}")
    print(f"    mediane={base:.2f}  ecart-type={statistics.pstdev([v for _,v in out]):.2f}")
    return out
print("\n== REFERENCE : bande sous le titre de la carte, x=300..400 ==")
profil(ref,300,400,1298,1316,'REF')
print("\n== REFERENCE (CONTROLE) : creme nue 60 px plus bas ==")
profil(ref,300,400,1360,1372,'REF creme nue')
print("\n== CAPTURE : bande homologue entre le titre et les rangees, x=300..400 ==")
profil(cap,300,400,1545,1570,'CAP')
