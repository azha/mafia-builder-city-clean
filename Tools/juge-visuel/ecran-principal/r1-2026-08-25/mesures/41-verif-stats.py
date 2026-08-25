# -*- coding: utf-8 -*-
"""Hauteur de capitale des valeurs de stats, dans la bande deja bornee, seuil eleve."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def cap(im,x0,y0,x1,y1,tag,ech,S,mini):
    px=im.load()
    lignes=[(y,sum(1 for x in range(x0,x1) if lum(px[x,y])>S)) for y in range(y0,y1)]
    ys=[y for y,n in lignes if n>=mini]
    print(f"  [{tag}] y {min(ys)}..{max(ys)} cap={(max(ys)-min(ys)+1)/ech:.2f} CSS   profil: "+
          " ".join(f"{y}:{n}" for y,n in lignes if n>0))
EK=3.0; EC=1080/392.0
print("### canon: ' 180/h ' (x545..652), bande 1486..1521 ###")
cap(K,545,1484,653,1524,'canon 180/h',EK,130,3)
print("### capture: ' Sain ' (x833..917), bande 1349..1389 ###")
cap(C,833,1345,918,1394,'c19 Sain',EC,130,3)
print("### capture: ' Au repos ' (x161..338) ###")
cap(C,161,1345,339,1394,'c19 Au repos',EC,130,3)
