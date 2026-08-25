# -*- coding: utf-8 -*-
"""(a) filet laiton HAUT de la fiche : etendue, en excluant la pastille d'annotation #5
       du canon (or, x CSS ~352-375). (b) hauteur de capitale du 'L' du titre."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def filet(path,label,yfil,xmax=348):
    im=open_img(path); c=css(im); px=im.load()
    xs=[x for x in range(0,int(xmax*c)) if (px[x,yfil][0]-px[x,yfil][2])>50]
    if not xs: print(f"  {label}: rien"); return
    print(f"  {label}: filet x CSS[{min(xs)/c:.2f},{(max(xs)+1)/c:.2f}] largeur={(max(xs)-min(xs)+1)/c:.2f} centre={((min(xs)+max(xs)+1)/2)/c:.2f} couleur={hexc(med_window(im,(min(xs)+max(xs))//2,yfil,0))}")
print("== filet du haut de la fiche (x<348 CSS pour exclure la pastille d'annotation) ==")
filet(CANON,'canon',1280)
filet(CAP16,'cap16',1172)
filet(CAP24,'cap24',1652)

print()
print("== hauteur de capitale du 'L' du titre de la fiche ==")
def capL(path,label,yfil,x0,x1,ycss,bg):
    im=open_img(path); c=css(im); px=im.load()
    rows=rows_with_ink(im,int(x0*c),yfil+int(ycss[0]*c),int(x1*c),yfil+int(ycss[1]*c),bg,26)
    rr=runs(rows, lambda n:n>0)
    print(f"  {label}: 'L' y CSS[{(rr[0][0]-yfil)/c:.2f},{(rr[-1][1]+1-yfil)/c:.2f}] hauteur={(rr[-1][1]-rr[0][0]+1)/c:.2f} CSS")
capL(CANON,'canon L de LE',1280,124.3,132.7,(15,36),(15,23,36))
capL(CAP16,'cap16 L de Lab',1172,179.6,189.2,(15,36),(20,27,39))
capL(CAP16,'cap16 a de Lab (x-height)',1172,192.0,200.8,(15,36),(20,27,39))
