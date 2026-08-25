# -*- coding: utf-8 -*-
"""Profil vertical: bornes chrome / art / fiche / dock, sur une colonne hors texte."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'

def trans(im,x,y0,y1,seuil,tag):
    px=im.load(); prev=None; out=[]
    for y in range(y0,y1):
        c=px[x,y]; L=lum(c)
        if prev is not None and abs(L-prev)>=seuil: out.append((y,px[x,y-1],c,round(L-prev,1)))
        prev=L
    print(f"\n [{tag}] x={x}, y {y0}..{y1}, seuil {seuil} -> {len(out)} transitions")
    for t in out: print(f"    y={t[0]:5d} {t[1]} -> {t[2]}  dL={t[3]:+.1f}")

C19=ouvrir(D+'capture-1080x1920.png')
C24=ouvrir(D+'capture-1080x2400.png')
K  =ouvrir(D+'ecran-canon.png')

trans(C19,60,0,1920,10,'1920 x=60')
trans(C24,60,0,2400,10,'2400 x=60')
