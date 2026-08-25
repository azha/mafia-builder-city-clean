# -*- coding: utf-8 -*-
"""Composition interne du medaillon: l'arc et la valeur se superposent-ils ?"""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
def zone_arc(im,cx,cy,rmin,rmax,tag,ech,disc):
    """bbox verticale des pixels colores (teal/rouge) = la bande de l'arc"""
    px=im.load(); ys=[]
    for y in range(cy-rmax-4, cy+rmax+5):
        for x in range(cx-rmax-4, cx+rmax+5):
            d=math.hypot(x-cx,y-cy)
            if rmin-3<=d<=rmax+3:
                r,g,b=px[x,y]
                if (g>r+15 and g>60) or (r>g+26 and r>b+22 and r>85): ys.append(y)
    print(f"  [{tag}] arc colore : y {min(ys)}..{max(ys)}  (soit {(min(ys)-disc[0])/ (disc[1]-disc[0])*100:.0f}%..{(max(ys)-disc[0])/(disc[1]-disc[0])*100:.0f}% du disque)")
    return min(ys),max(ys)
def zone_valeur(im,cx,cy,r,tag,S,ybas,disc):
    px=im.load(); ys=[]
    for y in range(disc[0], ybas):
        dy=y-cy
        if abs(dy)>=r-10: continue
        demi=math.sqrt((r-10)**2-dy*dy)
        for x in range(int(cx-demi),int(cx+demi)+1):
            if lum(px[x,y])>S: ys.append(y)
    print(f"  [{tag}] texte creme : y {min(ys)}..{max(ys)}  ({(min(ys)-disc[0])/(disc[1]-disc[0])*100:.0f}%..{(max(ys)-disc[0])/(disc[1]-disc[0])*100:.0f}% du disque)")
    return min(ys),max(ys)
print("### CANON : disque y 24..216, centre (588,120), moyeu y=131 ###")
a=zone_arc(K,588,131,44,58,'canon',3.0,(24,216))
print("  (le texte creme inclut l'aiguille ET  37%  : c'est le point)")
v=zone_valeur(K,588,120,96,'canon valeur+aiguille',150,158,(24,216))
print(f"  => recouvrement vertical arc / valeur : {min(a[1],v[1])-max(a[0],v[0]):+d} px")
print("\n### CAPTURE : disque y 17..189, centre (540,103), moyeu y=90 ###")
a=zone_arc(C,540,90,36,54,'c19',1080/392.0,(17,189))
v=zone_valeur(C,540,103,86,'c19 valeur+aiguille',150,152,(17,189))
print(f"  => recouvrement vertical arc / valeur : {min(a[1],v[1])-max(a[0],v[0]):+d} px")
print("\n### position du moyeu dans le disque ###")
print("  canon : (131-24)/192 = %.0f%%" % ((131-24)/192*100))
print("  c19   : (90-17)/172  = %.0f%%" % ((90-17)/172*100))
