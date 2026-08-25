# -*- coding: utf-8 -*-
"""Verification: hauteur de capitale du sous-titre, sur des lettres SANS accent."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def cap(im,x0,y0,x1,y1,tag,ech,S=90):
    px=im.load(); ys=[y for y in range(y0,y1) if sum(1 for x in range(x0,x1) if lum(px[x,y])>S)>=2]
    if not ys: print(f"  [{tag}] rien"); return
    print(f"  [{tag}] y {min(ys)}..{max(ys)}  cap={(max(ys)-min(ys)+1)/ech:.2f} CSS")
print("### canon sous-titre : ' BAR ' seul (x 367..425), sans accent ###")
cap(K,367,1395,426,1445,'canon BAR',3.0)
print("### canon sous-titre : mot 3 ' GENERAL ' avec accent (x 657..805) ###")
cap(K,657,1395,806,1445,'canon GENERAL',3.0)
print("### capture ' OP ' de OPERATIONNEL (x 420..470), sans accent ###")
cap(C,420,1275,470,1315,'c19 OP',1080/392.0)
print("### capture ' RATIONNEL ' (x 500..660) ###")
cap(C,500,1275,661,1315,'c19 RATIONNEL',1080/392.0)
print("\n### canon stats valeur ' 180/h ' (chiffres seuls, x 545..652) ###")
cap(K,545,1475,653,1530,'canon 180/h',3.0,120)
print("### capture ' Sain ' (x 833..917), S majuscule ###")
cap(C,833,1335,918,1400,'c19 Sain',1080/392.0,120)
