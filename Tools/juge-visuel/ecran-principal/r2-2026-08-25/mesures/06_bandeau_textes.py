# -*- coding: utf-8 -*-
"""Textes du bandeau : segmentation par lignes d'encre puis par colonnes.
bg = aplat du bandeau mesure localement (mediane d'une fenetre propre)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def seg(path,label,ybar_css,xband_css,tol=22):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    x0,x1=[int(v*c) for v in xband_css]; y0,y1=[int(v*c) for v in ybar_css]
    bg=med_window(im,(x0+x1)//2, y1-2, 3)
    # bg plus fiable : mediane globale de la bande hors encre -> prendre la mediane des medianes de 5 pts
    cands=[med_window(im,x0+2,y0+2,2), med_window(im,x1-3,y0+2,2), med_window(im,(x0+x1)//2,y0+1,1)]
    print(f"  --- {label} bande CSS x[{xband_css[0]},{xband_css[1]}] y[{ybar_css[0]},{ybar_css[1]}] bg~{hexc(bg)} cands={[hexc(v) for v in cands]}")
    rows=rows_with_ink(im,x0,y0,x1,y1,bg,tol)
    rr=runs(rows, lambda n: n> max(2,(x1-x0)*0.012))
    for (a,b) in rr:
        cols=cols_with_ink(im,x0,a,x1,b+1,bg,tol)
        cr=runs(cols, lambda n: n>0)
        if not cr: continue
        xa,xb=cr[0][0],cr[-1][1]
        # couleur : pixel le plus eloigne du fond
        best=(-1,None)
        for y in range(a,b+1):
            for x in range(xa,xb+1):
                p=px[x,y]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
                if d>best[0]: best=(d,p)
        print(f"     ligne y=[{a},{b}] h={b-a+1}px={(b-a+1)/c:.2f}CSS  x=[{xa},{xb}] w={(xb-xa+1)/c:.2f}CSS  x0css={xa/c:.2f} x1css={(xb+1)/c:.2f}  encre={hexc(best[1])}")

print("=== CANON : aile gauche (CSS x 5..130, y 6..50) ===")
seg(CANON,'canon-gauche',(6,50),(5,130))
print("=== CAP16 : aile gauche ===")
seg(CAP16,'cap16-gauche',(6,50),(5,150))
print("=== CAP24 : aile gauche ===")
seg(CAP24,'cap24-gauche',(6,50),(5,150))
print()
print("=== CANON : aile droite (CSS x 262..392) ===")
seg(CANON,'canon-droite',(6,50),(262,391))
print("=== CAP16 : aile droite ===")
seg(CAP16,'cap16-droite',(6,50),(262,391))
print("=== CAP24 : aile droite ===")
seg(CAP24,'cap24-droite',(6,50),(262,391))
