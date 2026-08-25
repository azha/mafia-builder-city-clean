# -*- coding: utf-8 -*-
"""bbox de la VALEUR du manometre seule (>=8 px creme par ligne: exclut l'aiguille, fine)."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def val(im,x0,x1,y0,y1,tag,ech,disc,S=130,mini=8):
    px=im.load(); ys=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>S)
        if n>=mini: ys.append(y)
    print(f"  [{tag}] y {min(ys)}..{max(ys)}  h={(max(ys)-min(ys)+1)/ech:.2f} CSS  ({(min(ys)-disc[0])/(disc[1]-disc[0])*100:.0f}%..{(max(ys)-disc[0])/(disc[1]-disc[0])*100:.0f}% du disque)")
    return min(ys),max(ys)
val(K,548,628,80,200,'canon 37%',3.0,(24,216))
val(C,490,592,60,200,'c19 Froid',1080/392.0,(17,189))
print("\n  bande de l'arc : canon y 73..131 (26..56%)   c19 y 42..99 (15..48%)")
print("  => canon : la valeur CHEVAUCHE l'arc ; c19 : la valeur est SOUS l'arc")
