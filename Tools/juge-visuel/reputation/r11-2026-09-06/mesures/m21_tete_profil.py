#!/usr/bin/env python3
"""m21 - profil rangee par rangee de la TETE : silhouette (non-fond), calotte
(sombre non-fond), visage (creme2). Coordonnees LOCALES du cadre.
Classes (convention de bord NOMINALE, mi-alpha entre fond de carte et coeur) :
  fond   = proche du fond de carte (L1<=18)
  visage = proche de creme2 (L1<=90)
  calotte/silhouette = tout le reste (trait sombre + remplissage 'encre')
Controle positif : au niveau des YEUX, la largeur du visage doit valoir ~126 px
en ref (r10 : yeux a x 26,5/35,5 u).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAD={'ref':('reference-1080x2102.png',21,452,(17,24,35)),
     'jeu':('capture-1080x2400.png',18,482,(13,22,34))}
CREME2=(185,173,146)
def L1(p,c): return abs(p[0]-c[0])+abs(p[1]-c[1])+abs(p[2]-c[2])
for nom in ('ref','jeu'):
    f,X0,Y0,FOND=CAD[nom]
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print(f'=== {nom} {f} {im.size} fond de carte {FOND}')
    print('   y | silhouette (x0..x1, l) | calotte (x0..x1, l) | visage (x0..x1, l)')
    for y in range(575,720,3):
        sil=[]; cal=[]; vis=[]
        for x in range(150,400):
            p=px[X0+x,Y0+y]
            if L1(p,FOND)<=18: continue
            sil.append(x)
            if L1(p,CREME2)<=90: vis.append(x)
            else: cal.append(x)
        def r(a): return f'{a[0]:3d}..{a[-1]:3d} ({a[-1]-a[0]+1:3d})' if a else '      -       '
        print(f'{y:5d} | {r(sil)} | {r(cal)} | {r(vis)}')
