# -*- coding: utf-8 -*-
"""FICHE : bbox (4 bords), bordure, remplissage haut/bas, filet laiton haut,
lignes de texte (titre / type / valeurs / libelles), separateurs verticaux,
boutons (bbox, gouttieres, remplissage, bordure, encre).
Ancrage : filet laiton du haut de la fiche (mesure 04)."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def lum(p): return (p[0]+p[1]+p[2])/3.0

def fiche(path,label,yfil):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label}  (filet haut fiche y={yfil}px = {yfil/c:.2f} CSS) =====")
    # ---- bords gauche/droite sur une ligne d'aplat (mi-hauteur approx : +60 CSS)
    ymid = yfil + int(60*c)
    # bord gauche : premier x (depuis 0) ou on entre dans un aplat sombre stable
    def edge_left(y):
        for x in range(0,W//2):
            if all(lum(px[x+k,y])<55 for k in range(0,6)): return x
        return None
    def edge_right(y):
        for x in range(W-1,W//2,-1):
            if all(lum(px[x-k,y])<55 for k in range(0,6)): return x
        return None
    l=edge_left(ymid); r=edge_right(ymid)
    print(f"    bords a y={ymid/c:.1f}CSS : x=[{l},{r}] -> CSS [{l/c:.2f},{(r+1)/c:.2f}] largeur={(r-l+1)/c:.2f}")
    print(f"      pixel du bord gauche : {hexc(px[l,ymid])}  x-1:{hexc(px[l-1,ymid])} x-2:{hexc(px[l-2,ymid])} x+2:{hexc(px[l+2,ymid])}")
    print(f"      pixel du bord droit  : {hexc(px[r,ymid])}  x+1:{hexc(px[r+1,ymid])} x+2:{hexc(px[r+2,ymid])} x-2:{hexc(px[r-2,ymid])}")
    # ---- bas de la fiche : colonne d'aplat proche du bord gauche
    xcol=l+int(5*c)
    yb=yfil
    while yb<H-2 and lum(px[xcol,yb+1])<58: yb+=1
    print(f"    bas fiche : y={yb} -> CSS {(yb+1)/c:.2f} ; HAUTEUR = {(yb-yfil+1)/c:.2f} CSS (du filet au bas)")
    print(f"      sous le bas : {hexc(px[xcol,yb+1])} {hexc(px[xcol,yb+4])} {hexc(px[xcol,yb+10])}")
    # ---- remplissage haut / bas
    print(f"    remplissage : haut {hexc(med_window(im,xcol,yfil+int(8*c),3))}  milieu {hexc(med_window(im,xcol,(yfil+yb)//2,3))}  bas {hexc(med_window(im,xcol,yb-int(6*c),3))}")
    # ---- rayon d'arrondi : y ou le bord gauche atteint sa valeur finale
    prof=[]
    for k in range(0,int(24*c)):
        y=yfil+k
        e=edge_left(y)
        prof.append((k,e))
    stable=[k for k,e in prof if e is not None and e<=l+1]
    print(f"    arrondi : bord gauche atteint sa valeur finale a {min(stable)/c:.2f} CSS sous le filet" if stable else "    arrondi : n/d")
    # ---- filet laiton du haut : etendue
    xs=[x for x in range(W) if (px[x,yfil][0]-px[x,yfil][2])>50]
    if xs: print(f"    filet haut fiche : x CSS [{min(xs)/c:.2f},{(max(xs)+1)/c:.2f}] largeur={(max(xs)-min(xs)+1)/c:.2f} couleur={hexc(med_window(im,(min(xs)+max(xs))//2,yfil,0))}")
    # ---- lignes de texte : profil d'encre sur [l+8CSS, r-8CSS]
    bgfill = med_window(im,xcol,(yfil+yb)//2,3)
    xa,xb = l+int(6*c), r-int(6*c)
    rows=rows_with_ink(im,xa,yfil+int(4*c),yb,xb,bgfill,26)
    print(f"    -- lignes d'encre (bg={hexc(bgfill)}) --")
    for (a,b) in runs(rows, lambda n: n> (xb-xa)*0.010):
        cols=cols_with_ink(im,xa,a,xb,b+1,bgfill,26)
        cr=runs(cols, lambda n:n>0)
        if not cr: continue
        x0,x1=cr[0][0],cr[-1][1]
        pts=[]
        for y in range(a,b+1):
            for x in range(x0,x1+1):
                p=px[x,y]; d=abs(p[0]-bgfill[0])+abs(p[1]-bgfill[1])+abs(p[2]-bgfill[2])
                if d>26*3: pts.append((d,p))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//10); top=[p for d,p in pts[:k]]
        col=(int(statistics.median([p[0] for p in top])),int(statistics.median([p[1] for p in top])),int(statistics.median([p[2] for p in top])))
        print(f"      y CSS [{a/c:7.2f},{(b+1)/c:7.2f}] h={(b-a+1)/c:6.2f}  x CSS [{x0/c:7.2f},{(x1+1)/c:7.2f}] w={(x1-x0+1)/c:6.2f}  centre={((x0+x1+1)/2)/c:7.2f}  encre={hexc(col)}  blocs={len(cr)}")
    return im,c,l,r,yfil,yb

fiche(CANON,'CANON',1280)
print()
fiche(CAP16,'CAP 1080x1920',1172)
print()
fiche(CAP24,'CAP 1080x2400',1652)
