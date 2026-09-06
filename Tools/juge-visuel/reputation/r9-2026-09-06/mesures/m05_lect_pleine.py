# -*- coding: utf-8 -*-
"""m05 — .lect complet (4 tuiles) + bbox du panneau .elast, sur les DEUX images.
Contrôle positif : l'entraxe des tuiles doit rendre gap=4 CSS des deux cotes (m04 : 14 px).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIS=(0x2a,0x36,0x48); ORF=(0xb0,0x8d,0x3e); ORV=(0xf2,0xc9,0x6b)
def prox(p,q,t): return abs(p[0]-q[0])<=t and abs(p[1]-q[1])<=t and abs(p[2]-q[2])<=t
def bord(c): return prox(c,LIS,26) or prox(c,ORF,48) or prox(c,ORV,48)

def scan(path,nom,xa,xb,ya,yb,frac=0.85,label=''):
    im=Image.open(path).convert('RGB');W,H=im.size;px=im.load()
    print('%s %s %dx%d  %s'%(nom,os.path.basename(path),W,H,label))
    n=xb-xa+1
    vals=[sum(1 for x in range(xa,xb+1) if bord(px[x,y])) for y in range(ya,yb+1)]
    runs=[];i=0
    while i<len(vals):
        if vals[i]>=n*frac:
            a=i
            while i<len(vals) and vals[i]>=n*frac: i+=1
            runs.append((ya+a,ya+i-1))
        else: i+=1
    print('   lignes-bord x=%d..%d y=%d..%d : %s'%(xa,xb,ya,yb,runs))
    return runs

def cols(path,nom,xa,xb,ya,yb,frac=0.60):
    im=Image.open(path).convert('RGB');px=im.load()
    m=yb-ya+1;out=[];i=xa;cc=[]
    for x in range(xa,xb+1):
        cc.append((x,sum(1 for y in range(ya,yb+1) if bord(px[x,y]))))
    i=0
    while i<len(cc):
        if cc[i][1]>=m*frac:
            a=cc[i][0]
            while i<len(cc) and cc[i][1]>=m*frac: i+=1
            out.append((a,cc[i-1][0]))
        else: i+=1
    print('   colonnes-bord x=%d..%d y=%d..%d : %s'%(xa,xb,ya,yb,out))
    return out

R=os.path.join(D,'reference-1080x2102.png'); C=os.path.join(D,'capture-1080x2400.png')
print('=== CAPTURE : les 4 tuiles ===')
scan(C,'CAP',545,1000,740,1200,0.80,'tuiles 1..4')
cols(C,"CAP",480,1079,760,1180,0.55)
print()
print('=== REFERENCE : bbox elast ===')
cols(R,"REF",0,1079,860,1600,0.90)
print('=== CAPTURE : bbox elast ===')
cols(C,"CAP",0,1079,660,1410,0.90)
