# -*- coding: utf-8 -*-
"""DOCK v2 : les ronds sont trouves par leur ANNEAU clair (border #ffffff22),
qui est un maximum LOCAL de luminance sur la ligne mediane des ronds.
Controle positif : le canon doit rendre 4 ronds de 46 CSS, centres a 94/162/230/298."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def ring_scan(im,y,c,W):
    px=im.load()
    v=[lum(px[x,y]) for x in range(W)]
    peaks=[]
    for x in range(2,W-2):
        if v[x]>=v[x-1] and v[x]>=v[x+1] and v[x]>v[x-2]+3 and v[x]>v[x+2]+3 and v[x]>18:
            peaks.append((x, round(v[x],1)))
    # fusionner les pics distants de <3px
    out=[]
    for x,val in peaks:
        if out and x-out[-1][0]<=3:
            if val>out[-1][1]: out[-1]=[x,val]
        else: out.append([x,val])
    return out

def dock(path,label,yc_css_guess):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label} =====")
    best=None
    for ycss in [yc_css_guess+d*0.5 for d in range(-14,15)]:
        y=int(ycss*c)
        if y<0 or y>=H: continue
        p=ring_scan(im,y,c,W)
        if len(p)==8:
            spread=p[-1][0]-p[0][0]
            if best is None or spread>best[0]: best=(spread,y,p)
    if best is None:
        print("    8 bords d'anneau non trouves ; essai : dump des pics par ligne")
        for ycss in [yc_css_guess+d for d in (-6,-3,0,3,6)]:
            y=int(ycss*c); print(f"     y={ycss}CSS :", [(round(x/c,1),v) for x,v in ring_scan(im,y,c,W)])
        return
    _,y,p = best
    print(f"    ligne mediane des ronds : y={y}px = {y/c:.2f} CSS ; 8 bords : {[round(x/c,2) for x,_ in p]}")
    for i in range(4):
        a=p[2*i][0]; b=p[2*i+1][0]
        print(f"      rond {i+1}: x CSS[{a/c:.2f},{b/c:.2f}] diam={(b-a+1)/c:.2f} centre={((a+b)/2)/c:.2f} (anneau {p[2*i][1]}/{p[2*i+1][1]})")
    cs=[((p[2*i][0]+p[2*i+1][0])/2)/c for i in range(4)]
    d0=(p[1][0]-p[0][0]+1)/c
    print(f"      centres={[round(v,2) for v in cs]}  ecarts={[round(cs[i+1]-cs[i],2) for i in range(3)]}  gouttiere={round(cs[1]-cs[0]-d0,2)}CSS")
    # vertical
    xa=int(cs[0]*c)
    yt=y
    while yt>0 and abs(lum(px[xa,yt-1])-lum(px[xa,y]))<40: yt-=1
    print(f"      remplissage rond1 : hg {hexc(med_window(im,int((cs[0]-11)*c),y-int(11*c),3))}  centre {hexc(med_window(im,xa,y,3))}  bd {hexc(med_window(im,int((cs[0]+11)*c),y+int(10*c),3))}")
    print(f"      fond du dock (x CSS 25, meme y) : {hexc(med_window(im,int(25*c),y,4))}")
    return y,c,cs,d0

print("attendu canon : diam 46, centres 94/162/230/298, gouttiere 22")
dock(CANON,'CANON',638.7)
print()
dock(CAP16,'CAP 1080x1920',638.7)
print()
dock(CAP24,'CAP 1080x2400',None if False else 813.0)
