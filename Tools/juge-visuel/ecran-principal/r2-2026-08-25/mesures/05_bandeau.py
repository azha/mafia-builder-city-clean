# -*- coding: utf-8 -*-
"""BANDEAU (barre haute) : hauteur, aplat, filet laiton (etendue + couleur),
medaillon (cercle + losange), ailes (encre + hauteur de capitale), barre de ratio.
Controle positif attendu : hauteur de barre ~52 CSS des deux cotes."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def bandeau(path, label):
    im = open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  --- {label} (1 px CSS = {c:.4f} px image) ---")
    # 1. filet laiton : ligne de R-B max hors medaillon
    best=(-999,None)
    for y in range(0,int(60*c)):
        s=0
        for x in range(int(0.12*W), int(0.30*W)): s+= px[x,y][0]-px[x,y][2]
        s/= (int(0.30*W)-int(0.12*W))
        if s>best[0]: best=(s,y)
    yfil=best[1]
    print(f"    filet laiton : y={yfil} px -> {yfil/c:.2f} CSS   (R-B moy={best[0]:.1f})")
    print(f"      couleur au pic (x=0.20W) : {hexc(med_window(im,int(0.20*W),yfil,1))}")
    # etendue horizontale du filet : ou R-B > 40
    xs=[x for x in range(W) if (px[x,yfil][0]-px[x,yfil][2])>40]
    if xs: print(f"      etendue filet : x=[{min(xs)},{max(xs)}] -> CSS [{min(xs)/c:.1f},{max(xs)/c:.1f}]  (n={len(xs)})")
    # 2. aplat du bandeau : mediane a 2 endroits neutres
    for fx in (0.08,0.14,0.86):
        yy=int(20*c)
        print(f"    aplat bandeau x={fx:.2f}W y={yy/c:.0f}CSS : {hexc(med_window(im,int(fx*W),yy,4))}")
    # 3. medaillon : cercle laiton. balayage de la colonne centrale
    cx=W//2
    ys=[y for y in range(0,int(90*c)) if (px[cx,y][0]-px[cx,y][2])>35]
    print(f"    colonne centrale, pixels laiton y: {ys[:6]} ... {ys[-6:] if len(ys)>6 else ''}")
    # bord du boitier : chercher le cercle par la ligne horizontale a mi-hauteur du medaillon
    ymid=int(40*c)
    xs2=[x for x in range(int(0.30*W),int(0.70*W)) if (px[x,ymid][0]-px[x,ymid][2])>35]
    if xs2:
        print(f"    medaillon a y={ymid/c:.1f}CSS : bords laiton x=[{min(xs2)},{max(xs2)}] diam={max(xs2)-min(xs2)+1}px -> {(max(xs2)-min(xs2)+1)/c:.2f} CSS ; centre x={(min(xs2)+max(xs2))/2:.1f}")
    return im,c,yfil

for p,l in ((CANON,'CANON'),(CAP16,'CAP 1080x1920'),(CAP24,'CAP 1080x2400')):
    bandeau(p,l)
