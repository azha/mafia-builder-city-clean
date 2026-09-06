#!/usr/bin/env python3
"""m04 - reperage des filets pleine largeur (or) et des frontieres de chrome.
Un filet = une ligne ou > 60% des pixels sont 'or' (R>1.25*B et R>60).
Controle positif : la reference porte le filet or de la plaque CTA basse ; on doit le trouver.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def est_or(p):
    r,g,b = p
    return r > 60 and r > 1.25*b and g > 0.45*r

def scan(fn, label):
    im = Image.open(os.path.join(D, fn)).convert('RGB'); W,H = im.size
    print(f"\n[{label}] {fn} {W}x{H}")
    px = im.load()
    runs=[]; cur=None
    for y in range(H):
        n = sum(1 for x in range(0,W,2) if est_or(px[x,y]))
        frac = n/(W/2)
        if frac > 0.60:
            if cur is None: cur=[y,y,frac,frac]
            else: cur[1]=y; cur[3]=max(cur[3],frac)
        else:
            if cur: runs.append(cur); cur=None
    if cur: runs.append(cur)
    for r in runs:
        mid=(r[0]+r[1])//2
        print(f"   filet or y={r[0]}..{r[1]} (h={r[1]-r[0]+1}px) frac_max={r[3]:.2f} couleur_mid={px[W//2,mid]}")
    return runs

scan('reference-1080x2102.png','REF')
scan('capture-1080x2400.png','CAP')
