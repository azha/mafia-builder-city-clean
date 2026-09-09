#!/usr/bin/env python3
"""Graisse : epaisseur des FUTS verticaux du titre 'La routine, tenue sans vous',
mesuree comme la mediane des longueurs de suites horizontales de px sombres,
rapportee a la hauteur de capitale (invariant d'echelle ET de chasse).
Controle : le SOUS-TITRE (regulier des deux cotes, meme texte) sert de temoin —
si le rapport y est egal et differe sur le titre, c'est une graisse, pas une police."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def futs(im,x0,y0,x1,y1,s=140):
    px=im.load(); runs=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            if lum(px[x,y])<s: n+=1
            else:
                if n>0: runs.append(n)
                n=0
        if n>0: runs.append(n)
    runs=[r for r in runs if r>=2]
    runs.sort()
    return dict(n=len(runs), mediane=runs[len(runs)//2], p25=runs[len(runs)//4], p75=runs[3*len(runs)//4])

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2)
print("\n--- TITRE (hauteur de capitale 35 px capture / 34 px temoin) ---")
a=futs(cap,139,2029,713,2064); b=futs(tem,141,1713,620,1747)
print(f"  capture : {a}  -> fut median / capitale = {a['mediane']/35:.3f}")
print(f"  temoin  : {b}  -> fut median / capitale = {b['mediane']/34:.3f}")
print(f"  rapport temoin/capture = {(b['mediane']/34)/(a['mediane']/35):.2f}x")
print("\n--- SOUS-TITRE (temoin de graisse REGULIERE des deux cotes, hauteur 22/23) ---")
a2=futs(cap,139,2073,330,2095,150); b2=futs(tem,143,1758,317,1781,150)
print(f"  capture : {a2}  -> fut median / hauteur = {a2['mediane']/22:.3f}")
print(f"  temoin  : {b2}  -> fut median / hauteur = {b2['mediane']/23:.3f}")
print(f"  rapport temoin/capture = {(b2['mediane']/23)/(a2['mediane']/22):.2f}x")
