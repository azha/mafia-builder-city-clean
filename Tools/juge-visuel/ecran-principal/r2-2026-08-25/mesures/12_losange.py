# -*- coding: utf-8 -*-
"""Losange laiton sous le medaillon : bbox exacte (fenetre etendue a 95 CSS)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def los(path,label):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    cx=W//2; x0=cx-int(12*c); x1=cx+int(12*c)
    pts=[(x,y) for y in range(int(68*c),int(95*c)) for x in range(x0,x1)
         if (px[x,y][0]-px[x,y][2])>55 and sum(px[x,y])/3.>90]
    if not pts: print(f"  {label}: AUCUN losange trouve"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  {label}: bbox CSS x[{min(xs)/c:.2f},{(max(xs)+1)/c:.2f}] y[{min(ys)/c:.2f},{(max(ys)+1)/c:.2f}] "
          f"w={(max(xs)-min(xs)+1)/c:.2f} h={(max(ys)-min(ys)+1)/c:.2f} n={len(pts)} couleur={hexc(med_window(im,(min(xs)+max(xs))//2,(min(ys)+max(ys))//2,1))}")
los(CANON,'canon')
los(CAP16,'cap16')
los(CAP24,'cap24')
