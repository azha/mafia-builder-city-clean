# -*- coding: utf-8 -*-
"""RYTHME VERTICAL : profil le long d'une colonne juste a l'INTERIEUR du bord gauche de chaque boite
(zone de padding, sans texte). Les transitions fond<->boite donnent les frontieres.
Reference : boites a x=50..1029 -> sonde x=56..66. Capture : boites a x=47..1032 -> sonde x=53..63.
CONTROLE POSITIF : la 1re frontiere detectee sur la REF doit tomber sur y=482 +-3 (bord haut enseigne mesure
par la couleur au script 15). CONTROLE NEGATIF : la meme sonde placee DANS la gouttiere (x=30..40 ref)
ne doit produire AUCUNE frontiere entre y=470 et y=660."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def profil(im,xa,xb,y0,y1):
    px=im.load()
    return [sum(lum(px[x,y]) for x in range(xa,xb))/(xb-xa) for y in range(y0,y1)]
def frontieres(v,y0,d=6.0):
    out=[]
    for i in range(1,len(v)):
        if abs(v[i]-v[i-1])>=d: out.append((y0+i, round(v[i-1],1), round(v[i],1)))
    # fusion des voisins
    f=[];last=-9
    for y,a,b in out:
        if y-last<=3: f[-1]=(f[-1][0],y,f[-1][2],b)
        else: f.append((y,y,a,b))
        last=y
    return f

print("### REFERENCE 1080x2102 — sonde x=56..66 (dans la boite, cote gauche)")
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
v=profil(ref,56,66,430,2100)
for a,b,l0,l1 in frontieres(v,430):
    print("   y=%4d..%4d  lum %5.1f -> %5.1f   (%.1f CSS depuis hrz6@435)" % (a,b,l0,l1,(a-435)/S))
print("  CONTROLE NEGATIF gouttiere x=30..40 entre y=470..660 :",
      [(a,b) for a,b,l0,l1 in frontieres(profil(ref,30,40,470,660),470)])

print()
print("### CAPTURE etat-vide (ecran seul) 1080x2400 — sonde x=53..63")
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
v=profil(cap,53,63,250,2200)
for a,b,l0,l1 in frontieres(v,250):
    print("   y=%4d..%4d  lum %5.1f -> %5.1f" % (a,b,l0,l1))
