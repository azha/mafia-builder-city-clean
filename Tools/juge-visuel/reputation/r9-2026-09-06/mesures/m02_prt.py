# -*- coding: utf-8 -*-
"""m02 — la carte PORTRAIT (.prt, bord 1px or_filet, largeur CSS 118) :
bbox exacte sur les deux images, via les colonnes/lignes majoritairement OR.
Contrôle positif : la largeur du cadre (cerne) doit rendre ~290 CSS des deux côtés.
Contrôle négatif : une colonne prise au centre du panneau ne doit PAS être or.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OR_FILET=(0xb0,0x8d,0x3e); OR_VIF=(0xf2,0xc9,0x6b)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
def est_or(c,t=48): return prox(c,OR_FILET,t) or prox(c,OR_VIF,t)

def bbox_or(path, nom, y0, y1, x0=0, x1=1080, seuil_frac=0.55):
    im=Image.open(path).convert('RGB'); W,H=im.size
    print('%s %s %dx%d  bande y=%d..%d' % (nom, os.path.basename(path), W,H, y0,y1))
    px=im.load()
    hauteur=y1-y0+1
    cols=[]
    for x in range(x0,x1):
        n=sum(1 for y in range(y0,y1+1) if est_or(px[x,y]))
        cols.append((x,n))
    seuil=hauteur*seuil_frac
    runs=[]; x=0
    while x<len(cols):
        if cols[x][1]>=seuil:
            a=cols[x][0]
            while x<len(cols) and cols[x][1]>=seuil: x+=1
            runs.append((a,cols[x-1][0]))
        else: x+=1
    print('  colonnes or (>=%.0f%% de la bande) : %s' % (seuil_frac*100, runs))
    return runs

# bande où la carte portrait existe des deux côtés (dans .elast)
print('--- REFERENCE ---')
bbox_or(os.path.join(D,'reference-1080x2102.png'),'REF', 900, 1400)
print('--- CAPTURE ---')
bbox_or(os.path.join(D,'capture-1080x2400.png'),'CAP', 620, 1050)
