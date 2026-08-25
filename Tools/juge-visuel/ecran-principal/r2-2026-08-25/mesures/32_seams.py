# -*- coding: utf-8 -*-
"""Coutures verticales : ou l'art commence et finit, colonne x CSS 3 (hors chrome)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0
for p,l in ((CANON,'canon'),(CAP16,'cap16'),(CAP24,'cap24')):
    im=open_img(p); W,H=im.size; c=css(im); px=im.load()
    x=int(3*c)
    prev=None; print(f"  {l} colonne x=3CSS, sauts de luminance > 12 :")
    out=[]
    for y in range(1,H):
        a=lum(px[x,y-1]); b=lum(px[x,y])
        if abs(b-a)>12: out.append((round(y/c,2), hexc(px[x,y-1]), hexc(px[x,y])))
    for t in out[:16]: print("     y CSS",t[0],":",t[1],"->",t[2])
    print(f"     hauteur totale = {H/c:.2f} CSS")
