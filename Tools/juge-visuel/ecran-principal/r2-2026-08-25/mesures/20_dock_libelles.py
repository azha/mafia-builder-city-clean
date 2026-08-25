# -*- coding: utf-8 -*-
"""Libelles du dock + FOND derriere eux + CONTRASTE. Et remplissage des ronds du canon
(geometrie du navigateur : rond 46x46 a (71,615.70))."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def labels(path,label,ylo,yhi,bgx=15):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label} =====")
    print("    fond de la bande dock (x CSS %d) :"%bgx, " ".join(f"{y}:{hexc(med_window(im,int(bgx*c),int(y*c),3))}" for y in ylo))
    # libelles : bande sous les ronds
    y0,y1=int(yhi[0]*c), min(H-1,int(yhi[1]*c))
    bg=med_window(im,int(bgx*c),(y0+y1)//2,4)
    rows=rows_with_ink(im,int(30*c),y0,int(362*c),y1,bg,20)
    for (a,b) in runs(rows, lambda n:n>5):
        cols=cols_with_ink(im,int(30*c),a,int(362*c),b+1,bg,20)
        cr=runs(cols, lambda n:n>0)
        grp=[]
        for u,v in cr:
            if grp and u<=grp[-1][1]+int(4*c): grp[-1][1]=v
            else: grp.append([u,v])
        pts=[]
        for yy in range(a,b+1):
            for xx in range(cr[0][0],cr[-1][1]+1):
                p=px[xx,yy]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
                if d>20*3: pts.append((d,p))
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//10); top=[p for d,p in pts[:k]]
        col=(int(statistics.median([p[0] for p in top])),int(statistics.median([p[1] for p in top])),int(statistics.median([p[2] for p in top])))
        # fond local : mediane juste sous la ligne d'encre
        loc=med_window(im,int(60*c),b+int(3*c),3)
        print(f"     bande y CSS[{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f} encre={hexc(col)} fond_local={hexc(loc)} contraste={contrast(col,loc):.2f}:1")
        print(f"        groupes x CSS : {[(round(u/c,1),round((v+1)/c,1),round((v-u+1)/c,1)) for u,v in grp]}")

labels(CANON,'CANON',(610,620,640,660,676,690),(662,700))
print()
labels(CAP16,'CAP 1080x1920',(610,620,640,660,676,690),(662,700))
print()
labels(CAP24,'CAP 1080x2400',(782,792,812,832,848,862),(834,872))
print()
print("== remplissage des ronds du canon (geometrie navigateur) ==")
im=open_img(CANON); c=3.0
print("   rond1 hg(83,627) :", hexc(med_window(im,int(83*c),int(627*c),3)),
      " centre(94,638.7):", hexc(med_window(im,int(94*c),int(638.7*c),3)),
      " bd(105,650):", hexc(med_window(im,int(105*c),int(650*c),3)))
print("   fond dock canon x=25 :", " ".join(f"{y}:{hexc(med_window(im,int(25*c),int(y*c),3))}" for y in (600,610,620,640,660,680,694)))
