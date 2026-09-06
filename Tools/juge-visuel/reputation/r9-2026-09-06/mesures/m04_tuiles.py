# -*- coding: utf-8 -*-
"""m04 — la colonne de droite (.lect) : bbox de chaque tuile .tl (bord 1px, lisere OFF / or ON),
hauteur, entraxe, largeur. CSS visée : .tl padding 5/8, border 1, gap .lect 4, lum 7x7.
Contrôle positif : la largeur de .prt mesurée en m02 (424/425 px = 118 CSS des deux cotes).
Contrôle négatif : la bande 'verdict' (au-dessus des tuiles) ne doit PAS produire de tuile.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIS=(0x2a,0x36,0x48); ORF=(0xb0,0x8d,0x3e); ORV=(0xf2,0xc9,0x6b)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
def bord(c): return prox(c,LIS,26) or prox(c,ORF,48) or prox(c,ORV,48)

def tuiles(path,nom,xa,xb,ya,yb,frac=0.85):
    im=Image.open(path).convert('RGB');W,H=im.size;px=im.load()
    print('%s %s %dx%d   fenetre x=%d..%d y=%d..%d'%(nom,os.path.basename(path),W,H,xa,xb,ya,yb))
    n=xb-xa+1
    vals=[sum(1 for x in range(xa,xb+1) if bord(px[x,y])) for y in range(ya,yb+1)]
    runs=[];i=0
    while i<len(vals):
        if vals[i]>=n*frac:
            a=i
            while i<len(vals) and vals[i]>=n*frac: i+=1
            runs.append((ya+a,ya+i-1))
        else: i+=1
    print('  lignes-bord :',runs)
    # apparier en tuiles
    for k in range(0,len(runs)-1,2):
        h=runs[k+1][1]-runs[k][0]+1
        print('    tuile %d : y=%d..%d  h=%d px  (%.2f CSS)'%(k//2+1,runs[k][0],runs[k+1][1],h,h/3.6))
    for k in range(0,len(runs)-3,2):
        e=runs[k+2][0]-runs[k][0]
        print('    entraxe %d->%d : %d px (%.2f CSS)'%(k//2+1,k//2+2,e,e/3.6))
    # colonnes bord => largeur de tuile
    m=yb-ya+1
    cols=[]
    for x in range(xa-40,min(W,xb+40)):
        c=sum(1 for y in range(ya,yb+1) if bord(px[x,y]))
        cols.append((x,c))
    seuil=m*0.45
    cr=[];i=0
    while i<len(cols):
        if cols[i][1]>=seuil:
            a=cols[i][0]
            while i<len(cols) and cols[i][1]>=seuil: i+=1
            cr.append((a,cols[i-1][0]))
        else: i+=1
    print('  colonnes-bord :',cr)

print('--- REFERENCE ---')
tuiles(os.path.join(D,'reference-1080x2102.png'),'REF', 545,1000, 980,1460)
print()
print('--- CAPTURE ---')
tuiles(os.path.join(D,'capture-1080x2400.png'),'CAP', 540,830, 740,1110)
