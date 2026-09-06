#!/usr/bin/env python3
"""Graisse du titre de la plaque (densite d'encre par unite de longueur),
anneau de la pastille, et hauteur des chiffres du compte compares sur la
REFERENCE nominale ('17', chiffres lineaires) plutot que sur '9'.
Controle positif : le sous-titre 'rien n'a devie' est le MEME texte des deux
cotes -> sa densite d'encre doit etre proche si la graisse est la meme.
Controle negatif : si titre ET sous-titre sortaient identiques, l'instrument ne
discriminerait pas la graisse -> on imprime les deux."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def encre(im,x0,y0,x1,y1,s=140):
    """bbox reelle de l'encre + nb de px sombres + densite"""
    px=im.load(); xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(px[x,y])<s: xs.append(x);ys.append(y);n+=1
    if not xs: return None
    bx=(min(xs),min(ys),max(xs),max(ys))
    larg=bx[2]-bx[0]+1; haut=bx[3]-bx[1]+1
    return dict(bbox=bx,larg=larg,haut=haut,px=n,dens_par_px_larg=round(n/larg,2),
                dens_rel=round(n/(larg*haut),3))

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2); ref=charge('reference-1080x2102.png')

print("\n--- TITRE 'La routine, tenue sans vous' ---")
print(f"  capture : {encre(cap,130,2025,780,2066)}")
print(f"  temoin  : {encre(tem,140,1709,780,1750)}")
print(f"  ref     : {encre(ref,140,1712,780,1753)}")
print("\n--- SOUS-TITRE \"rien n'a devie\" (meme texte des deux cotes) ---")
print(f"  capture : {encre(cap,130,2068,600,2098)}")
print(f"  temoin  : {encre(tem,140,1754,600,1784)}")
print(f"  ref     : {encre(ref,140,1757,600,1787)}")
print("\n--- COMPTE (chiffres) ---")
print(f"  capture '34' : {encre(cap,880,2030,1040,2090,s=150)}")
print(f"  ref     '17' : {encre(ref,880,1712,1040,1775,s=150)}")
print(f"  temoin  '9'  : {encre(tem,930,1712,1040,1775,s=150)}")

print("\n--- ANNEAU de la pastille : profil horizontal a travers son centre ---")
def profil(im,y,x0,x1):
    px=im.load(); return [(x,px[x,y]) for x in range(x0,x1)]
print("  capture, y=2061 (centre pastille), x=60..120 :")
for x,c in profil(cap,2061,60,120):
    if x%3==0: print(f"     x={x} {c}")
print("  temoin, y=1747 (centre pastille), x=64..126 :")
for x,c in profil(tem,1747,64,126):
    if x%3==0: print(f"     x={x} {c}")
