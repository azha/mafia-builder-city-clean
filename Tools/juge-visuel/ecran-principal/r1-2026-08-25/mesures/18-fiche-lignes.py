# -*- coding: utf-8 -*-
"""Bandes de texte dans la fiche (seuil absolu L>90, le fond de plaque plafonne a L=54)."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def bandes(im,x0,x1,y0,y1,tag,ech,S=90):
    px=im.load(); rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>S)
        rows.append((y,n))
    print(f"\n [{tag}] bandes ou n>=3 (seuil L>{S})")
    seg=[];deb=None
    for y,n in rows:
        if n>=3 and deb is None: deb=y
        if n<3 and deb is not None: seg.append((deb,y-1)); deb=None
    if deb is not None: seg.append((deb,y1-1))
    for a,b in seg:
        print(f"     y {a}..{b}  h={b-a+1}px = {(b-a+1)/ech:.2f} CSS   (haut {(a-y0)/ech:.1f} CSS depuis le haut de la fiche)")
    return seg
def cols(im,x0,x1,ya,yb,tag,ech,S=90):
    px=im.load(); seg=[];deb=None
    for x in range(x0,x1):
        n=sum(1 for y in range(ya,yb+1) if lum(px[x,y])>S)
        if n>=1 and deb is None: deb=x
        if n<1 and deb is not None:
            if x-deb>2: seg.append((deb,x-1))
            deb=None
    if deb is not None: seg.append((deb,x1-1))
    # regrouper les groupes separes de moins de 12px (mots)
    mots=[]
    for a,b in seg:
        if mots and a-mots[-1][1]<=int(6*ech): mots[-1][1]=b
        else: mots.append([a,b])
    print(f"     [{tag}] mots: "+"  ".join(f"x {a}..{b} (l={(b-a+1)/ech:.1f}CSS)" for a,b in mots))
    return mots

print("########## CANON fiche (x 39..1136, y 1277..1783) ##########")
sk=bandes(K,45,1130,1277,1784,'canon fiche',3.0)
print("########## CAPTURE fiche (x 33..1046, y 1188..1653) ##########")
sc=bandes(C,40,1040,1188,1654,'c19 fiche',1080/392.0)
print("\n### colonnes par bande — CANON ###")
for a,b in sk: cols(K,45,1130,a,b,f'canon y{a}-{b}',3.0)
print("\n### colonnes par bande — CAPTURE ###")
for a,b in sc: cols(C,40,1040,a,b,f'c19 y{a}-{b}',1080/392.0)
