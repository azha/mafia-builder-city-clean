# -*- coding: utf-8 -*-
"""Dock de la capture 1080x1920 : les ronds y sont SOMBRES sur un fond CLAIR
(l'inverse du canon) -> detection par obscurite. Puis libelles + fond derriere eux."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

im=open_img(CAP16); W,H=im.size; c=css(im); px=im.load()
# fond du bas : mediane d'une colonne a x CSS 15
print("  fond de la zone dock (x CSS 15) :", " ".join(f"{y}:{hexc(med_window(im,int(15*c),int(y*c),3))}" for y in (600,620,640,660,680,695)))
best=None
for y in range(int(600*c),int(690*c)):
    dark=[x for x in range(W) if lum(px[x,y])<70]
    grp=[]
    for x in dark:
        if grp and x<=grp[-1][1]+2: grp[-1][1]=x
        else: grp.append([x,x])
    grp=[g for g in grp if g[1]-g[0]>int(20*c)]
    if len(grp)==4:
        w=sum(g[1]-g[0] for g in grp)
        if best is None or w>best[0]: best=(w,y,grp)
if best:
    _,y,grp=best
    print(f"  ligne de diametre max : y={y}px = {y/c:.2f} CSS")
    cs=[]
    for i,(a,b) in enumerate(grp):
        print(f"    rond {i+1}: x CSS[{a/c:.2f},{(b+1)/c:.2f}] diam={(b-a+1)/c:.2f} centre={((a+b+1)/2)/c:.2f}")
        cs.append(((a+b+1)/2)/c)
    print(f"    centres={[round(v,2) for v in cs]} ecarts={[round(cs[i+1]-cs[i],2) for i in range(3)]}")
    xa=int(cs[0]*c); yt=y
    while yt>0 and lum(px[xa,yt-1])<70: yt-=1
    yb=y
    while yb<H-1 and lum(px[xa,yb+1])<70: yb+=1
    print(f"    rond1 vertical : y CSS[{yt/c:.2f},{(yb+1)/c:.2f}] h={(yb-yt+1)/c:.2f}")
    print(f"    remplissage rond1 : hg {hexc(med_window(im,int((cs[0]-11)*c),yt+int(11*c),3))} centre {hexc(med_window(im,xa,y,3))} bd {hexc(med_window(im,int((cs[0]+11)*c),yb-int(11*c),3))}")
    print(f"    bord du rond1 (profil horizontal) :", " ".join(f"{k:+d}:{hexc(px[grp[0][0]+k,y])}" for k in range(-3,4)))
