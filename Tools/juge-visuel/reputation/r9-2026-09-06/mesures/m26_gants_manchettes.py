# -*- coding: utf-8 -*-
"""m26 — v2 : gants et manchettes, fenetres RESTREINTES aux bras (m25 attrapait le col,
qui porte la meme couleur creme et se trouve dans la meme bande verticale).
Contrôle positif : la montre, deja localisee en m25, tombe a +106 px de l'axe du buste,
  exactement la valeur du SVG (unites 50 - 31 = 19 ; 1 unite = 5,574 px).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def prox(p,q,t): return all(abs(p[k]-q[k])<=t for k in range(3))
def tr(im,box,cible,tol,nom,axe):
    px=im.load();x0,y0,x1,y1=box;xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if prox(px[x,y],cible,tol): xs.append(x);ys.append(y)
    if not xs: print('   %-40s ABSENT (0 px)'%nom); return
    print('   %-40s x=%d..%d (%d px) y=%d..%d (%d px)  centre %+.0f px de l axe'
          %(nom,min(xs),max(xs),max(xs)-min(xs)+1,min(ys),max(ys),max(ys)-min(ys)+1,(min(xs)+max(xs))/2-axe))
CREME=(0xea,0xe0,0xc8); GANT=(0x23,0x2a,0x2d)
print('REF (axe du buste 293,5)')
tr(R,(120,1270,240,1330),CREME,10,'manchette gauche (creme, bras)',293.5)
tr(R,(350,1270,470,1330),CREME,10,'manchette droite (creme, bras)',293.5)
tr(R,(140,1360,250,1415),GANT,10,'gants (ellipse #232a2d)',293.5)
print('CAP (axe du buste 273,0)')
tr(C,(100,1060,230,1130),CREME,10,'manchette gauche (creme, bras)',273.0)
tr(C,(330,1060,450,1130),CREME,10,'manchette droite (creme, bras)',273.0)
tr(C,(120,1155,230,1210),GANT,10,'gants (ellipse #232a2d)',273.0)
