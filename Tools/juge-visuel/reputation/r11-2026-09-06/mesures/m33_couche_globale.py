#!/usr/bin/env python3
"""m33 - couche globale sur la ZONE DU CADRE (meme aire des deux cotes) :
luminance moyenne, densite d'encre (px dont la luminance depasse le fond de >8),
palette quantifiee (12 couleurs), rythme vertical (les grandes frontieres).
Controle positif : les deux zones doivent avoir le meme nombre de px echantillonnes.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
Z={'ref':('reference-1080x2102.png',21,452,1058,2078),
   'jeu':('capture-1080x2400.png',18,482,1061,2109)}
for nom,(f,x0,y0,x1,y1) in Z.items():
    im=Image.open(os.path.join(D,f)).convert('RGB')
    print(f'=== {nom} {f} {im.size} zone x{x0}..{x1} y{y0}..{y1}')
    sub=im.crop((x0,y0,x0+1037,y0+1626))
    px=sub.load(); w,h=sub.size
    tot=w*h
    s=0; enc=0
    for y in range(0,h,2):
        for x in range(0,w,2):
            l=lum(px[x,y]); s+=l
            if l>30: enc+=1
    n=(h//2+ (1 if h%2 else 0))*(w//2 + (1 if w%2 else 0))
    n=len(range(0,h,2))*len(range(0,w,2))
    print(f'  px echantillonnes {n} · luminance moyenne {s/n:.2f} · densite d encre (lum>30) {100*enc/n:.2f} %')
    q=sub.quantize(colors=10, method=2).convert('RGB')
    cols=sorted(q.getcolors(100000), reverse=True)[:10]
    print('  palette (couverture %, couleur) :')
    for c,rgb in cols:
        print(f'    {100*c/tot:5.2f} %  {rgb}')
