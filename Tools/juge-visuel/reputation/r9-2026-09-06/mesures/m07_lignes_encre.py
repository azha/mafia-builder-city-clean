# -*- coding: utf-8 -*-
"""m07 — profil d'ENCRE par ligne dans une fenetre large : liste les 'runs' de lignes
qui portent de l'encre, avec leur bbox. Sert a POSER les fenetres de m08 sans les deviner.
Contrôle positif : dans la fenetre de l'enseigne, on doit retrouver le filet or (7 px en REF).
"""
from PIL import Image, ImageChops
import os,sys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def runs(im,box,seuil,minpx=3):
    px=im.load();x0,y0,x1,y1=box;out=[];cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])>=seuil]
        if len(xs)>=minpx:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y;cur[2]=min(cur[2],min(xs));cur[3]=max(cur[3],max(xs))
        else:
            if cur: out.append(tuple(cur));cur=None
    if cur: out.append(tuple(cur))
    return out
def show(nom,im,box,seuil):
    print('%s  fenetre=%s seuil=%d'%(nom,box,seuil))
    for (a,b,xa,xb) in runs(im,box,seuil):
        print('    y=%4d..%4d h=%3d (%5.2f CSS)   x=%4d..%4d w=%4d'%(a,b,b-a+1,(b-a+1)/3.6,xa,xb,xb-xa+1))
sec=sys.argv[1] if len(sys.argv)>1 else 'enseigne'
if sec=='enseigne':
    show('REF enseigne+compteurs',R,(40,455,1040,830),95)
    print()
    show('CAP enseigne+compteurs',C,(40,255,1040,625),95)
