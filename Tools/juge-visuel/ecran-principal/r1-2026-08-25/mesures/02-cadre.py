# -*- coding: utf-8 -*-
"""Le cadre exterieur: y a-t-il une bande unie autour de l'UI ? de quelle couleur, quelle etendue ?"""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
C19 = ouvrir(D+'capture-1080x1920.png')
C24 = ouvrir(D+'capture-1080x2400.png')
K   = ouvrir(D+'ecran-canon.png')

def bande(im, tag):
    px=im.load(); W,H=im.size
    print(f"\n--- {tag} ({W}x{H}) ---")
    for y in [2, 50, 200, 600, 1000, 1400, H-100, H-3]:
        if y>=H: continue
        # premier x dont la couleur differe de px[0,y] de plus de 8
        c0=px[0,y]
        xg=None
        for x in range(0,W):
            c=px[x,y]
            if max(abs(c[i]-c0[i]) for i in range(3))>8: xg=x; break
        c1=px[W-1,y]; xd=None
        for x in range(W-1,-1,-1):
            c=px[x,y]
            if max(abs(c[i]-c1[i]) for i in range(3))>8: xd=x; break
        print(f"  y={y:5d}  gauche c0={c0} jusqu'a x={xg}   droite c1={c1} jusqu'a x={xd}")
    print("  colonnes: couleur mediane des colonnes extremes")
    print("   x=0..10 :", med(im,0,int(H*0.1),10,int(H*0.9)))
    print("   x=W-10..W:", med(im,W-10,int(H*0.1),W,int(H*0.9)))
    print("   y=0..6   :", med(im,int(W*0.1),0,int(W*0.9),6))
    print("   y=H-6..H :", med(im,int(W*0.1),H-6,int(W*0.9),H))

bande(C19,'capture 1080x1920')
bande(C24,'capture 1080x2400')
bande(K,'canon')
