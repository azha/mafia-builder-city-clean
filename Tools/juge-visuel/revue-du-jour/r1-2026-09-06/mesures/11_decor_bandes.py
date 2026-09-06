#!/usr/bin/env python3
"""Inventaire du DECOR du temoin v4-1 : bandes horizontales de la zone haute
(y 143..1360) avec leur couleur mediane, et la MEME mesure sur la capture.
Controle positif : la bande de la plaque (deja prouvee identique a 1/255) n'est
pas dans la plage -> on mesure bien le decor et pas la plaque.
Controle negatif : la capture doit rendre du (0,0,0) sur toute la plage."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def bandes(im,y0,y1,pas=100):
    px=im.load(); w,h=im.size; out=[]
    for a in range(y0,min(y1,h),pas):
        b=min(a+pas,y1,h)
        v=[px[x,y] for y in range(a,b,3) for x in range(0,w,7)]
        med=tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
        mn=min(sum(c) for c in v); mx=max(sum(c) for c in v)
        out.append((a,b-1,med,mn,mx))
    return out
tem=charge('etats/v4-1.png',1.2); cap=charge('capture-1080x2400.png')
print("\n  y0..y1    | TEMOIN v4-1 (mediane, somme min/max) | CAPTURE (mediane, somme min/max)")
bt=bandes(tem,143,1360); bc=bandes(cap,143,1360)
for t,c in zip(bt,bc):
    print(f"  {t[0]:4d}..{t[1]:4d} | {str(t[2]):>18s} {t[3]:4d}/{t[4]:4d} | {str(c[2]):>13s} {c[3]:3d}/{c[4]:3d}")
