# -*- coding: utf-8 -*-
"""Separateurs des stats, plaques des boutons, colonnes."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')

def sep(im,y0,y1,x0,x1,tag,ech,ref):
    """cherche les colonnes plus claires que leurs voisines (separateurs verticaux)"""
    px=im.load(); prof=[]
    for x in range(x0,x1):
        L=sorted(lum(px[x,y]) for y in range(y0,y1))
        prof.append((x, L[len(L)//2]))
    base=sorted(p[1] for p in prof)[len(prof)//2]
    pics=[(x,l) for x,l in prof if l>base+4]
    grp=[]
    for x,l in pics:
        if grp and x==grp[-1][-1][0]+1: grp[-1].append((x,l))
        else: grp.append([(x,l)])
    print(f"  [{tag}] fond median L={base:.1f} ; groupes plus clairs :")
    for g in grp:
        if len(g)>=2:
            xc=sum(p[0] for p in g)/len(g)
            print(f"      x {g[0][0]}..{g[-1][0]} (l={len(g)}px={len(g)/ech:.1f}CSS) centre={xc:.1f}px = {xc/ech:.1f} CSS  L max={max(p[1] for p in g):.1f}")
    print(f"      (reference: centre de la fiche = {ref:.1f} CSS)")

print("### separateurs des stats ###")
sep(K,1490,1570,60,1120,'canon separateurs',3.0,(39+1136)/2/3.0)
sep(C,1350,1425,45,1035,'c19 separateurs',1080/392.0,(33+1046)/2/(1080/392.0))

def plaque(im,y,x0,x1,tag,ech):
    px=im.load()
    print(f"  [{tag}] profil y={y} : ", end="")
    prev=None; out=[]
    for x in range(x0,x1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>7: out.append((x,round(prev,0),round(L,0)))
        prev=L
    print(" | ".join(f"{x}:{a:.0f}->{b:.0f}" for x,a,b in out))

print("\n### bords des boutons (profil horizontal au milieu de la rangee) ###")
plaque(K,1680,60,1130,'canon boutons y=1680',3.0)
plaque(C,1490,45,1040,'c19 boutons y=1490',1080/392.0)

print("\n### hauteur des plaques de boutons (profil vertical au centre du bouton 2) ###")
def vprof(im,x,y0,y1,tag):
    px=im.load(); prev=None
    print(f"  [{tag}] x={x} : ", end="")
    out=[]
    for y in range(y0,y1):
        L=lum(px[x,y])
        if prev is not None and abs(L-prev)>7: out.append((y,round(prev),round(L)))
        prev=L
    print(" | ".join(f"{y}:{a}->{b}" for y,a,b in out))
vprof(K,500,1600,1760,'canon bouton2 (BLANCHIR) x=500')
vprof(C,420,1420,1560,'c19 bouton2 (BLANCHIR) x=420')
vprof(K,120,1600,1760,'canon bouton1 or x=120')
vprof(C,100,1420,1560,'c19 bouton1 or x=100')
