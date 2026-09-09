# -*- coding: utf-8 -*-
"""m16 — la tuile ALLUMEE (.tl.on) de la capture, comparee au temoin #119 (etats/m-119.png,
900x1752, echelle x3,0 — les deux seuls cadres du groupe qui portent une tuile allumee).
CSS visee : .tl.on{border-color:#b08d3e;background:#16191b} ; .tl.on .lum{background:#f2c96b;
box-shadow:0 0 7px #f2c96b99} ; .tl.on b{color:#eae0c8}.
Contrôle positif : la tuile ETEINTE de la meme image (bord #2a3648, pastille #2a3648).
Contrôle négatif : la meme sonde sur le fond du panneau doit rendre 0 pastille.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
E=Image.open(os.path.join(D,'etats','m-119.png')).convert('RGB')
print('CAP %dx%d   TEMOIN #119 %dx%d (x3,0)'%(C.size+E.size))
def med(im,cx,cy,r=6):
    px=im.load();ch=[[],[],[]]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            c=px[x,y]
            for k in range(3): ch[k].append(c[k])
    return tuple(sorted(v)[len(v)//2] for v in ch)
def hx(c): return '#%02x%02x%02x'%c
def pastille(im,box,cible,tol,ech,nom):
    px=im.load();x0,y0,x1,y1=box;xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
                xs.append(x);ys.append(y)
    if not xs: print('   %-28s AUCUN pixel'%nom); return None
    w=max(xs)-min(xs)+1;h=max(ys)-min(ys)+1
    print('   %-28s x=%d..%d y=%d..%d  d=%dx%d px (%.2f x %.2f CSS)  n=%d'
          %(nom,min(xs),max(xs),min(ys),max(ys),w,h,w/ech,h/ech,len(xs)))
    return (min(xs),max(xs),min(ys),max(ys))
ORV=(0xf2,0xc9,0x6b); LIS=(0x2a,0x36,0x48)
print('CAPTURE — tuile 1 ALLUMEE (y=766..858, x=533..1007)')
print('   fond tuile ON     :',hx(med(C,960,812)),' voulu #16191b')
print('   fond tuile OFF (2):',hx(med(C,960,920)),' voulu #111823')
print('   bord tuile ON     :',hx(med(C,700,767,2)),' voulu #b08d3e')
print('   bord tuile OFF (2):',hx(med(C,700,874,1)),' voulu #2a3648')
pastille(C,(540,780,600,845),ORV,50,3.6,'pastille ON (or_vif)')
pastille(C,(540,890,600,950),LIS,26,3.6,'pastille OFF (lisere)')
print('   contrôle négatif (fond du panneau) :',end='')
pastille(C,(600,1220,900,1300),ORV,50,3.6,' pastille sur fond vide')
print()
print('TEMOIN #119 (x3,0) — reperage des tuiles')
def runs_or(im,xa,xb,ya,yb,frac=.8):
    px=im.load();n=xb-xa+1;out=[];i=0
    v=[sum(1 for x in range(xa,xb+1) if abs(px[x,y][0]-0xb0)<=48 and abs(px[x,y][1]-0x8d)<=48 and abs(px[x,y][2]-0x3e)<=48) for y in range(ya,yb+1)]
    while i<len(v):
        if v[i]>=n*frac:
            a=i
            while i<len(v) and v[i]>=n*frac: i+=1
            out.append((ya+a,ya+i-1))
        else: i+=1
    return out
print('   lignes or (colonne des tuiles) :',runs_or(E,470,820,780,1200))
