# -*- coding: utf-8 -*-
"""Masque du fond declare (backdrop) et bornes des zones."""
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'

BACK=(34,38,49)
def masque_backdrop(im, tag, tol=6):
    px=im.load(); W,H=im.size
    print(f"\n--- {tag} : masque backdrop {BACK} tol={tol} ---")
    n=0
    lignes=[]
    for y in range(H):
        c=0
        for x in range(W):
            p=px[x,y]
            if abs(p[0]-BACK[0])<=tol and abs(p[1]-BACK[1])<=tol and abs(p[2]-BACK[2])<=tol:
                c+=1
        lignes.append(c); n+=c
    print(f"  pixels backdrop total : {n} / {W*H} = {100.0*n/(W*H):.2f}%")
    # segments de lignes 100% backdrop
    seg=[]; deb=None
    for y,c in enumerate(lignes):
        plein = c>=W-2
        if plein and deb is None: deb=y
        if not plein and deb is not None: seg.append((deb,y-1)); deb=None
    if deb is not None: seg.append((deb,H-1))
    print(f"  bandes horizontales 100% backdrop : {seg}")
    # pour quelques y, l'etendue laterale du backdrop
    for y in [300, 700, 1200, 1600]:
        if y<H:
            g=0
            while g<W and abs(px[g,y][0]-BACK[0])<=tol and abs(px[g,y][1]-BACK[1])<=tol and abs(px[g,y][2]-BACK[2])<=tol: g+=1
            d=W-1
            while d>=0 and abs(px[d,y][0]-BACK[0])<=tol and abs(px[d,y][1]-BACK[1])<=tol and abs(px[d,y][2]-BACK[2])<=tol: d-=1
            print(f"    y={y}: backdrop x<{g} et x>{d}  => colonne utile {g}..{d} ({d-g+1}px = {(d-g+1)/2.7551:.1f} CSS)")
    return lignes

for f,t in [('capture-1080x1920.png','1080x1920'),('capture-1080x2400.png','1080x2400')]:
    im=ouvrir(D+f); masque_backdrop(im,t)
