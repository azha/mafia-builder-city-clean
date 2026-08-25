# -*- coding: utf-8 -*-
"""FICHE v2 : bas exact, bordure, ombre portee, puis TOUTES les lignes d'encre.
Le fond de reference est pris DANS la fiche, sur une colonne de marge (aplat)."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def run_fiche(path,label,yfil,xl,xr):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label} : filet={yfil}px={yfil/c:.2f}CSS  bords x=[{xl},{xr}] =====")
    xc=xl+int(15*c)   # 15 CSS a l'interieur : marge, jamais de texte (padding 16)
    # bas exact
    y=yfil+int(120*c)
    while y<H-1 and lum(px[xc,y+1])<62: y+=1
    yb=y
    print(f"    BAS de la fiche : y={yb}px -> CSS {(yb+1)/c:.2f} ; HAUTEUR={(yb-yfil+1)/c:.2f} CSS")
    # ombre portee sous la fiche : profil
    print("    profil sous le bas (dy CSS: couleur) :", " ".join(f"{d}:{hexc(px[xc,yb+int(d*c)])}" for d in (1,3,6,10,16,24)))
    # bordure : profil horizontal fin a mi-hauteur
    ym=(yfil+yb)//2
    print("    profil du bord gauche a mi-hauteur :", " ".join(f"{x-xl:+d}:{hexc(px[x,ym])}" for x in range(xl-3,xl+4)))
    print("    profil du bord droit  a mi-hauteur :", " ".join(f"{x-xr:+d}:{hexc(px[x,ym])}" for x in range(xr-3,xr+4)))
    # remplissage haut / bas (gradient)
    print(f"    remplissage : +6CSS {hexc(med_window(im,xc,yfil+int(6*c),3))}   +80CSS {hexc(med_window(im,xc,yfil+int(80*c),3))}   -6CSS/bas {hexc(med_window(im,xc,yb-int(6*c),3))}")
    # lignes d'encre
    bg = med_window(im,xc,yfil+int(80*c),3)
    xa,xb = xl+int(5*c), xr-int(5*c)
    rows=rows_with_ink(im,xa,yfil+int(3*c),xb,yb-int(2*c),bg,24)
    print(f"    -- lignes d'encre (bg={hexc(bg)}) --")
    for (a,b) in runs(rows, lambda n: n> (xb-xa)*0.008):
        cols=cols_with_ink(im,xa,a,xb,b+1,bg,24)
        cr=runs(cols, lambda n:n>0)
        if not cr: continue
        x0,x1=cr[0][0],cr[-1][1]
        pts=[]
        for yy in range(a,b+1):
            for xx in range(x0,x1+1):
                p=px[xx,yy]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
                if d>24*3: pts.append((d,p))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//10); top=[p for d,p in pts[:k]]
        col=(int(statistics.median([p[0] for p in top])),int(statistics.median([p[1] for p in top])),int(statistics.median([p[2] for p in top])))
        blocs=[(f"{u/c:.1f}",f"{(v+1)/c:.1f}") for u,v in cr if v-u > int(1.5*c)]
        print(f"      y CSS [{(a-yfil)/c:7.2f},{(b+1-yfil)/c:7.2f}] (rel. filet) h={(b-a+1)/c:6.2f}  x CSS [{x0/c:7.2f},{(x1+1)/c:7.2f}] centre={((x0+x1+1)/2)/c:7.2f}  encre={hexc(col)}  blocs={len(cr)} {blocs[:6]}")

run_fiche(CANON,'CANON',1280,36,1139)
print()
run_fiche(CAP16,'CAP 1080x1920',1172,33,1046)
print()
run_fiche(CAP24,'CAP 1080x2400',1652,33,1046)
