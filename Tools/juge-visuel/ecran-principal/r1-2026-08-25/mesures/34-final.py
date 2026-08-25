# -*- coding: utf-8 -*-
"""Libelles du medaillon (fenetres serrees, hors anneau) + barre de ratio de l'argent."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
EK=3.0; EC=1080/392.0
def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>S: xs.append(x);ys.append(y);cols.append(c)
    if not xs: print(f"  [{tag}] rien>L{S}"); return
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    print(f"  [{tag}] h={(max(ys)-min(ys)+1)/ech:.2f}CSS l={(max(xs)-min(xs)+1)/ech:.1f}CSS y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)} encre={ink}")
print("### libelle sous la valeur du manometre (anneau exclu) ###")
encre(K,530,156,648,182,'canon HEAT (x530..648)',EK,80)
encre(C,486,148,596,178,'c19 CHALEUR (x486..596)',EC,80)
print("### valeur du manometre (aiguille exclue: on prend la moitie basse) ###")
encre(K,540,132,640,158,'canon 37% moitie basse',EK,120)
encre(C,480,118,604,152,'c19 Froid',EC,120)
print("\n### barre de ratio sous l'argent ###")
def barre(im,y0,y1,x0,x1,tag,ech):
    px=im.load()
    for y in range(y0,y1):
        segs=[]; deb=None
        for x in range(x0,x1):
            c=px[x,y]; on = lum(c)>50
            if on and deb is None: deb=x
            if not on and deb is not None:
                if x-deb>10: segs.append((deb,x-1))
                deb=None
        if deb is not None and x1-deb>10: segs.append((deb,x1-1))
        if segs and len(segs)>=1 and (segs[-1][1]-segs[0][0])>40:
            print(f"    [{tag}] y={y}: "+"  ".join(f"x {a}..{b} ({(b-a+1)/ech:.1f}CSS) {px[(a+b)//2,y]}" for a,b in segs))
print("  canon (attendu: or 68% puis gris, total 74 CSS a x=17 CSS)")
barre(K,116,136,30,300,'canon ratio',EK)
print("  capture")
barre(C,100,125,180,420,'c19 ratio',EC)
