# -*- coding: utf-8 -*-
"""Textes du medaillon + filet qui traverse ; textes des boutons."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
EK=3.0; EC=1080/392.0
def encre(im,x0,y0,x1,y1,tag,ech,S):
    px=im.load(); xs=[];ys=[];cols=[];fonds=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            (cols if lum(c)>S else fonds).append(c)
            if lum(c)>S: xs.append(x);ys.append(y)
    if not xs: print(f"  [{tag}] rien > L{S}"); return
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    fonds.sort(key=lum); fond=fonds[len(fonds)//2]
    print(f"  [{tag}] h={(max(ys)-min(ys)+1)/ech:.2f}CSS l={(max(xs)-min(xs)+1)/ech:.1f}CSS "
          f"y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)} centreX={(min(xs)+max(xs))/2/ech:.1f}CSS "
          f"encre={ink} fond={fond} contraste={contraste(ink,fond):.2f}:1")
print("### medaillon: valeur et libelle ###")
encre(K,520,110,660,155,'canon  37% ',EK,120)
encre(K,520,158,660,185,'canon  HEAT ',EK,70)
encre(C,470,105,615,150,'c19  Froid ',EC,120)
encre(C,470,150,615,180,'c19  CHALEUR ',EC,70)
print("\n### le filet laiton traverse-t-il le disque ? (echantillon a la hauteur du filet) ###")
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75
for im,tag,yy,cx,r in ((K,'canon',154,588,96),(C,'c19',131,540,86)):
    px=im.load()
    dedans=[x for x in range(int(cx-r*0.7),int(cx+r*0.7)) if est_or(px[x,yy])]
    print(f"  [{tag}] y={yy} (filet), a l'interieur du disque (x {int(cx-r*0.7)}..{int(cx+r*0.7)}): {len(dedans)} px laiton")
    print(f"        couleurs au centre: "+" ".join(str(px[x,yy]) for x in range(int(cx)-12,int(cx)+13,6)))
print("\n### textes des boutons ###")
encre(K,90,1650,400,1720,'canon COLLECTER',EK,60)
encre(K,435,1650,742,1720,'canon BLANCHIR',EK,120)
encre(C,80,1460,368,1520,'c19 COLLECTER',EC,60)
encre(C,398,1460,684,1520,'c19 BLANCHIR',EC,150)
print("\n### couleur du texte du CTA or ###")
def sombre(im,x0,y0,x1,y1,t):
    px=im.load(); b=min(((lum(px[x,y]),px[x,y]) for y in range(y0,y1) for x in range(x0,x1)))
    print(f"    {t:44s} L min={b[0]:.1f} {b[1]}")
sombre(K,120,1660,370,1710,'canon encre du CTA (plus sombre)')
sombre(C,100,1470,350,1515,'c19 encre du CTA (plus sombre)')
