# -*- coding: utf-8 -*-
"""Hauteur de capitale, seuil haut pour exclure les volutes (opacite .28) du canon."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def encre(im,x0,y0,x1,y1,tag,ech,marge):
    px=im.load()
    Ls=sorted(lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1))
    bg=Ls[len(Ls)//4]; seuil=bg+marge
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>seuil: xs.append(x);ys.append(y);cols.append(c)
    if not xs: print(f"  [{tag}] rien (bg={bg:.0f} seuil={seuil:.0f})"); return
    cols.sort(key=lum); top=cols[int(len(cols)*.8):]
    ink=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    h=max(ys)-min(ys)+1; w=max(xs)-min(xs)+1
    print(f"  [{tag}] h={h}px = {h/ech:.2f} CSS | l={w}px = {w/ech:.1f} CSS | y {min(ys)}..{max(ys)} x {min(xs)}..{max(xs)} | encre={ink} | seuil={seuil:.0f}")
EK=3.0; EC=1080/392.0
print("\n### CANON — fenetres nettoyees des volutes (seuil haut) ###")
encre(K, 90,55,245,115,'canon chiffres  24 850 ',EK,110)
encre(K,1015,66,1060,115,'canon chiffres  21: ',EK,110)
encre(K, 832,40,912,68,'canon JOUR (capitales seules)',EK,60)
encre(K, 48,28,175,56,'canon ARGENT',EK,60)
print("\n### CAPTURE — memes elements ###")
encre(C,215,55,395,105,'c19 chiffres 10,000.00',EC,110)
encre(C,895,55,1010,105,'c19 Dawn (D = capitale)',EC,110)
encre(C,925,20,1010,50,'c19 JOUR 1',EC,60)
encre(C,195,20,305,50,'c19 ARGENT',EC,60)
print("\n### CONTROLE POSITIF : meme mot, meme fonte -> ARGENT dans les deux ###")
print("     (attendu proche ; la casse et l'espacement different, pas la hauteur)")
