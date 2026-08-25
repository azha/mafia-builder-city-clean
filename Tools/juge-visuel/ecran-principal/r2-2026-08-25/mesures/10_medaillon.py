# -*- coding: utf-8 -*-
"""MEDAILLON : cercle (diametre, centre, couleur du cercle), losange, arc du cadran,
aiguille, textes internes (hauteur de capitale + couleur + position)."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def med(path,label):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    cx=W//2
    print(f"  --- {label} (c={c:.4f}) ---")
    # cercle : balayage vertical sur la colonne a +/- 0 du centre : bord haut/bas laiton
    ys=[y for y in range(0,int(100*c)) if (px[cx,y][0]-px[cx,y][2])>35]
    # regrouper
    rr=runs([(y,1) for y in ys], lambda v:True)
    print(f"    colonne centrale, plages laiton (px) : {rr}")
    # diametre horizontal a plusieurs hauteurs
    for ycss in (30,36,40,44):
        y=int(ycss*c)
        xs=[x for x in range(int(0.30*W),int(0.70*W)) if (px[x,y][0]-px[x,y][2])>35]
        if xs:
            print(f"    y={ycss}CSS : x=[{min(xs)},{max(xs)}] largeur={(max(xs)-min(xs)+1)/c:.2f}CSS centre={((min(xs)+max(xs))/2)/c:.2f}CSS")
    # fond interieur du boitier
    print(f"    interieur boitier (centre-haut) : {hexc(med_window(im,cx,int(20*c),4))}")
    print(f"    interieur boitier (centre-bas)  : {hexc(med_window(im,cx,int(60*c),4))}")
    # arc : couleurs a gauche / droite de l'arc, a mi-hauteur du cadran
    return im,c

med(CANON,'CANON')
med(CAP16,'CAP16')
med(CAP24,'CAP24')

print()
print("== textes internes du medaillon : segmentation par lignes d'encre ==")
def texts(path,label,bg,y0,y1,xw=30):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    cx=W//2; x0=cx-int(xw*c); x1=cx+int(xw*c)
    rows=rows_with_ink(im,x0,int(y0*c),x1,int(y1*c),bg,22)
    for (a,b) in runs(rows, lambda n:n>3):
        cols=cols_with_ink(im,x0,a,x1,b+1,bg,22)
        cr=runs(cols, lambda n:n>0)
        if not cr: continue
        xa,xb=cr[0][0],cr[-1][1]
        pts=[]
        for y in range(a,b+1):
            for x in range(xa,xb+1):
                p=px[x,y]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]); pts.append((d,p))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//10); top=[p for d,p in pts[:k]]
        col=(int(statistics.median([p[0] for p in top])),int(statistics.median([p[1] for p in top])),int(statistics.median([p[2] for p in top])))
        print(f"  {label}: y=[{a},{b}] h={(b-a+1)/c:.2f}CSS  ycss=[{a/c:.2f},{(b+1)/c:.2f}] x=[{xa/c:.2f},{(xb+1)/c:.2f}]CSS w={(xb-xa+1)/c:.2f} encre={hexc(col)}")
texts(CANON,'canon',(22,27,38),12,80)
texts(CAP16,'cap16',(22,27,38),12,80)
