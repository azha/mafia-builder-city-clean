# -*- coding: utf-8 -*-
"""Couche globale: palette dominante, luminance moyenne, densite d'encre, rythme vertical."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
from PIL import Image
def palette(p,tag,n=8):
    im=Image.open(p).convert('RGB'); print(f"  [ouvert] {p} -> {im.size}")
    small=im.resize((im.size[0]//4, im.size[1]//4), Image.BOX)
    q=small.quantize(colors=n, method=Image.MEDIANCUT).convert('RGB')
    cnt={}
    px=q.load(); W,H=q.size
    for y in range(H):
        for x in range(W):
            c=px[x,y]; cnt[c]=cnt.get(c,0)+1
    tot=W*H
    print(f"  [{tag}] palette dominante ({n} classes) :")
    for c,k in sorted(cnt.items(), key=lambda t:-t[1]):
        print(f"      {str(c):18s} {100.0*k/tot:5.1f}%   L={lum(c):6.1f}")
    # luminance moyenne
    L=0; px2=small.load()
    for y in range(small.size[1]):
        for x in range(small.size[0]): L+=lum(px2[x,y])
    L/= small.size[0]*small.size[1]
    print(f"      luminance moyenne de l ecran : {L:.1f}")
    return L
print("=== CANON ==="); palette(D+'ecran-canon.png','canon')
print("\n=== CAPTURE 1080x1920 ==="); palette(D+'capture-1080x1920.png','c19')
print("\n=== CAPTURE 1080x2400 ==="); palette(D+'capture-1080x2400.png','c24')
