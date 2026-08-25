# -*- coding: utf-8 -*-
"""Le bas de l'ecran: y a-t-il une plaque de dock, et jusqu'ou monte la bande teintee ?"""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
C=ouvrir(D+'capture-1080x1920.png'); C2=ouvrir(D+'capture-1080x2400.png'); K=ouvrir(D+'ecran-canon.png')
def col(im,x,y0,y1,tag,pas=1,seuil=6):
    px=im.load(); prev=None; out=[]
    for y in range(y0,y1,pas):
        c=px[x,y]; L=lum(c)
        if prev is not None and abs(L-prev)>seuil: out.append((y,prevc,c))
        prev=L; prevc=c
    print(f"  [{tag}] x={x} y {y0}..{y1}: "+(" | ".join(f"{y}:{a}->{b}" for y,a,b in out) if out else "aucune rupture > %d L"%seuil))
def echant(im,x,ys,tag):
    px=im.load(); print(f"  [{tag}] x={x}: "+"  ".join(f"{y}:{px[x,y]}" for y in ys))

print("### CAPTURE 1080x1920 — bas ###")
col(C,60,1650,1920,'c19 x=60 (dans la colonne d art)')
col(C,20,1650,1920,'c19 x=20 (HORS colonne d art)')
col(C,1060,1650,1920,'c19 x=1060 (HORS colonne d art)')
echant(C,20,range(1650,1920,30),'c19 x=20')
echant(C,1000,range(1650,1920,30),'c19 x=1000')
print("\n### CAPTURE 1080x2400 — bas ###")
col(C2,60,2100,2400,'c24 x=60')
col(C2,20,2100,2400,'c24 x=20 (HORS colonne d art)')
echant(C2,20,range(2100,2400,30),'c24 x=20')
echant(C2,60,range(2100,2400,30),'c24 x=60')
print("\n### CANON — bas (dock 1817..2088) ###")
echant(K,60,range(1800,2091,30),'canon x=60')
