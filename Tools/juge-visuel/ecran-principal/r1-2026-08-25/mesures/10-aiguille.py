# -*- coding: utf-8 -*-
"""Aiguille (angle) + etendue angulaire des zones de l'arc, autour du moyeu."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')

def cls(c):
    r,g,b=c
    if g>r+14 and g>60: return 'T'
    if r>g+26 and r>b+20 and r>85: return 'R'
    if min(c)>150 and max(c)-min(c)<60: return 'A'   # aiguille / texte creme
    if max(c)-min(c)<32 and sum(c)/3>50: return 'g'
    return '.'

def polaire(im,cx,cy,r,tag,a0=-110,a1=111,pas=2):
    px=im.load(); seq=[]
    for a in range(a0,a1,pas):
        rad=math.radians(a); x=cx+r*math.sin(rad); y=cy-r*math.cos(rad)
        seq.append((a,px[int(round(x)),int(round(y))]))
    s=''.join(cls(c) for a,c in seq)
    print(f"  [{tag}] r={r}  {a0}..{a1-1} pas {pas}")
    print(f"     {s}")
    segs=[];cur=None;deb=None
    for i,(a,c) in enumerate(seq):
        k=cls(c)
        if k!=cur:
            if cur is not None and cur in 'TRA': segs.append((cur,deb,seq[i-1][0]))
            cur=k;deb=a
    if cur is not None and cur in 'TRA': segs.append((cur,deb,seq[-1][0]))
    for k,d,f in segs: print(f"       {k}: {d:+4d}..{f:+4d} deg   (largeur {f-d+pas} deg)")
    return seq

print("\n### CANON — moyeu (588,131) ###")
for r in (46,50,54): polaire(K,588,131,r,'canon arc')
print("\n### CANON — aiguille: rayons 30..45 ###")
for r in (30,36,42): polaire(K,588,131,r,'canon aig',-90,91,1)

print("\n### CAPTURE 1920 — moyeu (540,90) ###")
for r in (41,45,49): polaire(C,540,90,r,'c19 arc')
print("\n### CAPTURE 1920 — aiguille: rayons 18..34 ###")
for r in (18,24,30): polaire(C,540,90,r,'c19 aig',-90,91,1)
