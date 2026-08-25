# -*- coding: utf-8 -*-
"""Bandes unies (DistrictSceneBackdrop) vs ART : detection par ECART-TYPE de ligne.
Une bande unie a un ecart-type quasi nul sur les colonnes hors chrome."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def bandes(path,label):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label} ({W}x{H}, {H/c:.1f} CSS de haut) =====")
    plat=[]
    for y in range(0,H):
        v=[sum(px[x,y])/3.0 for x in range(int(0.02*W),int(0.98*W),7)]
        s=statistics.pstdev(v)
        plat.append((y, s, statistics.median(v)))
    rr=runs([(y,s) for y,s,_ in plat], lambda s: s<1.5)
    for a,b in rr:
        if b-a > int(3*c):
            m=statistics.median([m for y,s,m in plat if a<=y<=b])
            print(f"    bande UNIE y CSS[{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f}  luminance mediane={m:.1f}  couleur={hexc(med_window(im,W//2,(a+b)//2,3))}")
    # ou l'art commence/finit : premieres/dernieres lignes a fort ecart-type
    art=[y for y,s,_ in plat if s>8]
    if art: print(f"    ART (ecart-type>8) : de y CSS {min(art)/c:.2f} a {max(art)/c:.2f}")

bandes(CANON,'CANON')
bandes(CAP16,'CAP 1080x1920')
bandes(CAP24,'CAP 1080x2400')
