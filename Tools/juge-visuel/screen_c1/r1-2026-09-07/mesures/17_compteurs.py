#!/usr/bin/env python3
"""Trois tuiles de compteurs : largeurs et gouttieres, en px et en CSS (/3.6).
Controle positif : 3 tuiles + 2 gouttieres doivent totaliser la largeur du bloc
(274 CSS) des deux cotes. Controle negatif : une rangee hors du bloc -> 0 tuile."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def tuiles(f,y,fond_max,nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    dans=[x for x in range(W) if lum(px[x,y])>fond_max]
    grp,prev=[],None
    for x in dans:
        if prev is None or x!=prev+1: grp.append([x,x])
        else: grp[-1][1]=x
        prev=x
    grp=[g for g in grp if g[1]-g[0]>40]
    print(f"  [{f[:26]:26s} {W}x{H}] {nom:34s} y={y}")
    tot=0
    for i,(a,b) in enumerate(grp):
        l=b-a+1; tot+=l
        print(f"      tuile {i+1}: x={a}..{b}  largeur={l:4d}px = {l/3.6:6.2f} CSS")
    for i in range(len(grp)-1):
        g=grp[i+1][0]-grp[i][1]-1
        print(f"      gouttiere {i+1}: {g:3d}px = {g/3.6:5.2f} CSS")
    if grp:
        span=grp[-1][1]-grp[0][0]+1
        print(f"      ETENDUE totale = {span}px = {span/3.6:.2f} CSS "
              f"(controle : ~274 CSS -> {'OK' if abs(span/3.6-274)<4 else 'ECART'})")
    return grp

tuiles('reference-1080x2102.png', 700, 16.0, 'REFERENCE .fen (fond .jrn6 sombre)')
tuiles('capture-1080x2400.png',   520, 17.0, 'CAPTURE tuiles compteurs')
print()
print("  CONTROLE NEGATIF (rangee de gouttiere, aucune tuile attendue) :")
tuiles('capture-1080x2400.png',   666, 17.0, 'CAPTURE gouttiere y=666')
print()
print("=== hauteurs comparees (CSS) ===")
print("  REFERENCE .fen      : y679..793  = 114px = 31.67 CSS   (CSS source: 4+14+3+6+3+2 = 32)")
print("  CAPTURE  tuile      : y483..642  = 159px = 44.17 CSS")
print(f"  delta = +12.50 CSS = +{100*(44.17-31.67)/31.67:.1f} %")
