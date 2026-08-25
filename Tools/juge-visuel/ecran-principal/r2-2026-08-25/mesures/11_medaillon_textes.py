# -*- coding: utf-8 -*-
"""Textes du medaillon : seuil de LUMINANCE (le fond du boitier est sombre).
Bande etroite (centre +/- 20 CSS) pour ne pas ramasser le cercle laiton ni l'arc lateral."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def txt(path,label,thr=140,half=20,y0=10,y1=82):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    cx=W//2; x0=cx-int(half*c); x1=cx+int(half*c)
    rows=[]
    for y in range(int(y0*c),int(y1*c)):
        n=sum(1 for x in range(x0,x1) if sum(px[x,y])/3.0>thr)
        rows.append((y,n))
    for (a,b) in runs(rows, lambda n:n>=2):
        cols=[]
        for x in range(x0,x1):
            n=sum(1 for y in range(a,b+1) if sum(px[x,y])/3.0>thr)
            cols.append((x,n))
        cr=runs(cols, lambda n:n>0)
        if not cr: continue
        xa,xb=cr[0][0],cr[-1][1]
        pts=[]
        for y in range(a,b+1):
            for x in range(xa,xb+1):
                p=px[x,y]
                if sum(p)/3.0>thr: pts.append(p)
        col=(int(statistics.median([p[0] for p in pts])),int(statistics.median([p[1] for p in pts])),int(statistics.median([p[2] for p in pts])))
        print(f"  {label}: y CSS [{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f}  x CSS [{xa/c:.2f},{(xb+1)/c:.2f}] w={(xb-xa+1)/c:.2f}  encre={hexc(col)} n={len(pts)}")

print("== CANON (attendu : cadran svg 44x28, '37%' Georgia 13px, 'HEAT' 7px) ==")
txt(CANON,'canon')
print("== CAP16 ==")
txt(CAP16,'cap16')
print("== CAP24 ==")
txt(CAP24,'cap24')
