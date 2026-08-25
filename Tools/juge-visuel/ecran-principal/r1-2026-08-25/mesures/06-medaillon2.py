# -*- coding: utf-8 -*-
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
def est_or(c):
    r,g,b=c
    return r>110 and r-b>45 and g>75

def scan_v(im,x,y0,y1,tag):
    px=im.load(); ys=[y for y in range(y0,y1) if est_or(px[x,y])]
    grp=[]; 
    for y in ys:
        if grp and y==grp[-1][-1]+1: grp[-1].append(y)
        else: grp.append([y])
    print(f"  [{tag}] x={x} groupes laiton verticaux: {[(g[0],g[-1]) for g in grp]}")
    return grp
def scan_h(im,y,x0,x1,tag):
    px=im.load(); xs=[x for x in range(x0,x1) if est_or(px[x,y])]
    grp=[]
    for x in xs:
        if grp and x==grp[-1][-1]+1: grp[-1].append(x)
        else: grp.append([x])
    print(f"  [{tag}] y={y} groupes laiton horizontaux: {[(g[0],g[-1]) for g in grp]}")
    return grp

K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
print("\n### CANON ###")
scan_v(K,588,0,300,'canon x=588 (centre)')
print("\n### CAPTURE 1920 ###")
scan_v(C,540,0,300,'c19 x=540 (centre)')
print("\n### filet laiton: ou est-il ? scan vertical loin du medaillon ###")
scan_v(K,200,0,300,'canon x=200')
scan_v(C,200,0,300,'c19 x=200')
scan_v(C,900,0,300,'c19 x=900')
scan_v(K,900,0,300,'canon x=900')
