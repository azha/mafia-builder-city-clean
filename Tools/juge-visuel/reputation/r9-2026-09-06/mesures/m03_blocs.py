# -*- coding: utf-8 -*-
"""m03 — frontières verticales des blocs. Trois sondes indépendantes :
 (a) lignes OR dans la colonne de la carte portrait  -> haut/bas de .prt
 (b) lignes de LISERE (#2a3648) pleine largeur du .elast -> haut/bas de .elast et .pann
 (c) profil de luminance moyenne par ligne, pour situer les respirations
Contrôle positif : la hauteur du cadre (cerne haut->cerne bas) = 1662 px des deux côtés (m01).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIS=(0x2a,0x36,0x48); ORF=(0xb0,0x8d,0x3e); ORV=(0xf2,0xc9,0x6b)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t

def lignes_or(path,nom,xa,xb,ya,yb,frac=0.55):
    im=Image.open(path).convert('RGB');W,H=im.size;px=im.load()
    print('%s %s %dx%d' % (nom,os.path.basename(path),W,H))
    n=xb-xa+1; runs=[];y=ya
    vals=[sum(1 for x in range(xa,xb+1) if prox(px[x,y],ORF,48) or prox(px[x,y],ORV,48)) for y in range(ya,yb+1)]
    i=0
    while i<len(vals):
        if vals[i]>=n*frac:
            a=i
            while i<len(vals) and vals[i]>=n*frac: i+=1
            runs.append((ya+a, ya+i-1))
        else: i+=1
    print('  (a) lignes OR sur x=%d..%d : %s' % (xa,xb,runs))

def lignes_lisere(path,nom,xa,xb,ya,yb,frac=0.80):
    im=Image.open(path).convert('RGB');px=im.load()
    n=xb-xa+1; runs=[]
    vals=[sum(1 for x in range(xa,xb+1) if prox(px[x,y],LIS,26)) for y in range(ya,yb+1)]
    i=0
    while i<len(vals):
        if vals[i]>=n*frac:
            a=i
            while i<len(vals) and vals[i]>=n*frac: i+=1
            runs.append((ya+a, ya+i-1))
        else: i+=1
    print('  (b) lignes LISERE sur x=%d..%d : %s' % (xa,xb,runs))

print('--- REFERENCE (cadre 434..2096) ---')
lignes_or(os.path.join(D,'reference-1080x2102.png'),'REF', 90, 495, 434, 2100)
lignes_lisere(os.path.join(D,'reference-1080x2102.png'),'REF', 60, 1020, 434, 2100)
print()
print('--- CAPTURE (cadre 232..1894) ---')
lignes_or(os.path.join(D,'capture-1080x2400.png'),'CAP', 80, 488, 232, 1900)
lignes_lisere(os.path.join(D,'capture-1080x2400.png'),'CAP', 55, 1025, 232, 1900)
