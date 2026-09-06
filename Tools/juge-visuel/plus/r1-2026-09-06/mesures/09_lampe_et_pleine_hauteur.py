#!/usr/bin/env python3
"""Complement du 08 : masque VERT (lampe de bureau) sur la PLEINE hauteur des deux images
— le 08 l'avait restreint a la zone contenu, ou la lampe de la reference n'est pas : son
controle positif y rendait 0,00 %, donc il ne mesurait rien pour ce masque.
Controle positif : sur la reference PLEINE HAUTEUR le masque doit rendre une aire non nulle."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
def vert(c): return c[1]>c[0]+25 and c[1]>c[2]+25 and c[1]>60
for nom,im in (('REFERENCE',R),('CAPTURE',C)):
    px=im.load(); n=0;t=0;pts=[]
    for y in range(0,im.height,2):
        for x in range(0,im.width,2):
            t+=1
            if vert(px[x,y]): n+=1; pts.append((x,y))
    bb = (min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts)) if pts else None
    print(f"  {nom:10s} vert = {100.0*n/t:6.3f} %   bbox={bb}")
