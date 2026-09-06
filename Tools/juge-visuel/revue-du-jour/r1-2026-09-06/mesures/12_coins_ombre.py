#!/usr/bin/env python3
"""Rayon d'arrondi de la plaque et ombre portee.
Rayon : on cherche, dans le carre de coin, le plus petit r tel que le pixel
(x0+r, ytop+r) soit du remplissage -> approxime le rayon.
Ombre : profil de luminance sous le bord bas de la plaque, sur le fond.
Controle positif : sur la CAPTURE, le pixel (x0+1, ytop+1) doit deja etre du
remplissage (coin carre) ; sur le TEMOIN il ne doit pas l'etre si le coin est
arrondi -> l'instrument discrimine."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def coin(im,x0,ytop,nom,s=150):
    px=im.load(); out=[]
    for r in range(0,16):
        out.append((r, tuple(px[x0+r,ytop+r]), 'REMPLI' if lum(px[x0+r,ytop+r])>=s else 'vide'))
    print(f"  [{nom}] diagonale du coin haut-gauche depuis ({x0},{ytop}) :")
    for r,c,e in out[:10]: print(f"      r={r:2d} {c} {e}")

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2)
# capture : fill x0=35, ytop=1992 ; temoin : fill x0=60, ytop cote gauche=1668
coin(cap,35,1992,'capture')
coin(tem,60,1668,'temoin')

print("\n--- ombre portee sous la plaque (profil de luminance du fond) ---")
def sous(im,y0,n,x=540):
    px=im.load(); return [(y, tuple(px[x,y]), round(lum(px[x,y]),1)) for y in range(y0,y0+n)]
print("  capture, x=540, y=2131.. :")
for r in sous(cap,2131,14): print(f"      y={r[0]} {r[1]} L={r[2]}")
print("  temoin, x=540, y=1824.. :")
for r in sous(tem,1824,14): print(f"      y={r[0]} {r[1]} L={r[2]}")

print("\n--- CTA : presence dans la zone libre ---")
print("  temoin : bande claire mesuree au 02 = y 1859..2052 (h=194), x 47..1032")
px=cap.load()
n=sum(1 for y in range(2131,2171) for x in range(1080) if sum(px[x,y])>12)
print(f"  capture : px non-noirs entre le bas de la plaque (2131) et le haut du dock (2171) = {n} / {40*1080}")
