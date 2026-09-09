#!/usr/bin/env python3
"""Plaque du registre ('La routine, tenue sans vous') : bbox complete, tranche
rouge de gauche, rayon d'arrondi, pastille, couleurs, hauteurs de capitale.
Controle positif : la couleur de remplissage beige doit sortir a moins de 6/255
par canal entre reference et temoin (meme cadre, meme rendu).
Controle negatif : la tranche rouge de gauche doit sortir NON VIDE cote maquette."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def med(im,cx,cy,r=8):
    px=im.load(); v=[px[x,y] for x in range(cx-r,cx+r+1) for y in range(cy-r,cy+r+1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
def bbox_objet(im,y0,y1,fond,seuil=30):
    px=im.load(); w,h=im.size; xs=[];ys=[]
    for y in range(y0,min(y1,h)):
        for x in range(w):
            r,g,b=px[x,y]
            if abs(r-fond[0])+abs(g-fond[1])+abs(b-fond[2])>seuil: xs.append(x);ys.append(y)
    return (min(xs),min(ys),max(xs),max(ys)) if xs else None
def largeur_par_ligne(im,y0,y1,seuil=110):
    """largeur du remplissage clair, ligne par ligne -> revele l'arrondi"""
    px=im.load(); w,h=im.size; out=[]
    for y in range(y0,min(y1,h)):
        xs=[x for x in range(w) if 0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2]>=seuil]
        out.append((y, xs[0] if xs else None, xs[-1] if xs else None, len(xs)))
    return out

cap=charge('capture-1080x2400.png')
tem=charge('etats/v4-1.png',1.2)
ref=charge('reference-1080x2102.png')

print("\n--- remplissage beige au centre (mediane 17x17, >=3px de tout bord) ---")
print(f"  capture (700,2060) = {med(cap,700,2060)}")
print(f"  temoin  (700,1740) = {med(tem,700,1740)}")
print(f"  ref     (700,1745) = {med(ref,700,1745)}")

print("\n--- bbox COMPLETE de la plaque (fond = noir/nuit local) ---")
print(f"  capture (y 1975..2145, fond noir) = {bbox_objet(cap,1975,2145,(0,0,0),30)}")
print(f"  temoin  (y 1645..1840, fond {med(tem,540,1650)}) = {bbox_objet(tem,1645,1840,med(tem,540,1650),30)}")

print("\n--- arrondi : largeur du remplissage clair ligne par ligne (12 premieres et 12 dernieres) ---")
for nom,im,a,b in [('capture',cap,1988,2135),('temoin',tem,1660,1828)]:
    L=largeur_par_ligne(im,a,b)
    print(f"  [{nom}] y={a}..{b}")
    for r in L[:12]: print(f"      y={r[0]} x={r[1]}..{r[2]} n={r[3]}")
    print("      ...")
    for r in L[-12:]: print(f"      y={r[0]} x={r[1]}..{r[2]} n={r[3]}")

print("\n--- tranche rouge de gauche (px ou r>g+20 et r>b+20) dans la bande de la plaque ---")
def tranche(im,y0,y1,x0,x1):
    px=im.load(); n=0; xs=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=px[x,y]
            if r>g+20 and r>b+20 and r>60: n+=1; xs.append(x)
    return n,(min(xs),max(xs)) if xs else None
print(f"  temoin  x 40..100  : {tranche(tem,1660,1828,40,100)}")
print(f"  capture x 20..100  : {tranche(cap,1988,2135,20,100)}")
