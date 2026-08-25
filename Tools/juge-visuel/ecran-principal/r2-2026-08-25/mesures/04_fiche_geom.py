# -*- coding: utf-8 -*-
"""Geometrie de la fiche, methode robuste :
   (a) filet laiton HAUT de la fiche  (.fiche::after) -> y du haut
   (b) bord gauche/droite sur une ligne d'APLAT (haut+8) par saut de luminance
   (c) bas de la fiche par la meme ligne d'aplat cherchee du bas vers le haut
Controle positif : le canon doit rendre w=366 CSS (mesure navigateur : 366.00)."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def lum(p): return (p[0]+p[1]+p[2])/3.0

def gold_row(im, ylo, yhi, xa, xb):
    px = im.load(); best=(-999,None)
    for y in range(ylo,yhi):
        s=0
        for x in range(xa,xb): s+= px[x,y][0]-px[x,y][2]
        s/=float(xb-xa)
        if s>best[0]: best=(s,y)
    return best

def hedges(im, y, thr=55):
    px=im.load(); W,_=im.size
    cx=W//2
    l=cx
    while l>0 and lum(px[l,y])<thr: l-=1
    r=cx
    while r<W-1 and lum(px[r,y])<thr: r+=1
    return l+1, r-1

def report(path, ylo, yhi, label):
    im = open_img(path); W,H=im.size; c=css(im)
    g,y = gold_row(im, ylo, yhi, int(W*0.35), int(W*0.65))
    print(f"    {label}: filet laiton HAUT fiche y={y} (R-B={g:.1f}) -> CSS {y/c:.2f}")
    yy = y+int(8*c/3)  # ~8 px canon
    l,r = hedges(im, yy)
    print(f"    {label}: a y={yy} bords x=[{l},{r}] w={r-l+1}px -> CSS x={l/c:.2f} w={(r-l+1)/c:.2f}")
    # bas : descendre le long de x=(l+r)//2+? -> plutot colonne pres du bord gauche (aplat)
    xcol = l + int(6*c/3)
    px=im.load()
    yb=y
    while yb<H-1 and lum(px[xcol,yb+1])<55: yb+=1
    print(f"    {label}: bas fiche (colonne x={xcol}) y={yb} -> CSS {yb/c:.2f} ; hauteur CSS={(yb-y+1)/c:.2f}")
    return y, l, r, yb, c

print("=== CANON (nav: fiche 366.00 x 169.19 a (13.00,424.52)) ===")
report(CANON, 1250, 1330, 'canon')
print("=== CAP 1080x1920 ===")
report(CAP16, 1140, 1230, 'cap16')
print("=== CAP 1080x2400 ===")
report(CAP24, 1620, 1720, 'cap24')
