# -*- coding: utf-8 -*-
"""Temps 1/2 : structure verticale. Trouve le filet laiton sous le bandeau,
le haut/bas de la fiche, le haut du dock. Tout en px image PUIS converti en px CSS."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def gold_score(im, y, x0, x1):
    """moyenne de (R-B) sur la bande : le filet laiton #b08d3e a R-B=0xb0-0x3e=114."""
    px = im.load(); s=0
    for x in range(x0,x1):
        p = px[x,y]; s += (p[0]-p[2])
    return s/float(x1-x0)

def scan(path, ymax_frac=0.20):
    im = open_img(path); W,H = im.size; c = css(im)
    x0,x1 = int(W*0.25), int(W*0.75)
    best = []
    for y in range(0, int(H*ymax_frac)):
        best.append((gold_score(im,y,x0,x1), y))
    best.sort(reverse=True)
    print(f"    filet laiton candidat (haut) : y={best[0][1]} (R-B={best[0][0]:.1f})  -> {best[0][1]/c:.2f} CSS")
    for g,y in best[:5]:
        print(f"       y={y:5d}  R-B={g:6.1f}  css={y/c:7.2f}   couleur mediane={hexc(med_window(im,W//2,y,1))}")
    return im

print("=== CANON ===");   scan(CANON)
print("=== CAP 1080x1920 ==="); scan(CAP16)
print("=== CAP 1080x2400 ==="); scan(CAP24)
