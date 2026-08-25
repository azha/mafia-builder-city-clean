# -*- coding: utf-8 -*-
"""Hauteur de la valeur du manometre : canon '37%' (isolee du cote DROIT, hors aiguille)
vs capture 'Froid'. Controle : la meme fenetre sur le canon doit contenir le '%'."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0
def h(path,label,x0,x1,y0,y1,thr=150):
    im=open_img(path); c=css(im); px=im.load()
    rows=[]
    for y in range(int(y0*c),int(y1*c)):
        n=sum(1 for x in range(int(x0*c),int(x1*c)) if lum(px[x,y])>thr)
        rows.append((y,n))
    rr=runs(rows, lambda n:n>=1)
    if not rr: print(f"  {label}: rien"); return
    a,b=rr[0][0],rr[-1][1]
    print(f"  {label}: y CSS[{a/c:.2f},{(b+1)/c:.2f}] hauteur={(b-a+1)/c:.2f} CSS")
h(CANON,"canon '%' (x 200-208)",200,208,28,50)
h(CAP16,"cap16 'Froid' (x 182-210)",182,210,40,56)
h(CAP16,"cap16 'F' seul (x 182-189)",182,189,40,56)
