# -*- coding: utf-8 -*-
"""bbox propre de la valeur du cadran (>=6 px creme par ligne: exclut l'aiguille et l'anneau)."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def cap(im,x0,y0,x1,y1,tag,ech,S,mini):
    px=im.load()
    lig=[(y,sum(1 for x in range(x0,x1) if lum(px[x,y])>S)) for y in range(y0,y1)]
    ys=[y for y,n in lig if n>=mini]
    print(f"  [{tag}] y {min(ys)}..{max(ys)} h={(max(ys)-min(ys)+1)/ech:.2f} CSS")
    print("        profil: "+" ".join(f"{y}:{n}" for y,n in lig if n>0))
print("### canon  37%  (x 554..621), disque 24..216, arc colore jusqu'a y=131 ###")
cap(K,554,90,622,175,'canon 37%',3.0,130,6)
print("### capture  Froid  (x 499..580), disque 17..189, arc colore jusqu'a y=99 ###")
cap(C,499,100,581,160,'c19 Froid',1080/392.0,130,6)
