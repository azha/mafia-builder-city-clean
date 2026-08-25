# -*- coding: utf-8 -*-
"""DOCK : ronds (diametre, centres, ecarts, remplissage, bordure), pointe active,
pastille de notification, libelles (hauteur de capitale, couleur), FOND derriere les libelles."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
def lum(p): return sum(p)/3.0

def dock(path,label,ysearch):
    im=open_img(path); W,H=im.size; c=css(im); px=im.load()
    print(f"  ===== {label} (c={c:.4f}, H={H}) =====")
    # trouver la ligne des ronds : ligne ou 4 plages sombres apparaissent
    best=None
    for y in range(ysearch[0],ysearch[1]):
        seq=[(x, lum(px[x,y])) for x in range(0,W)]
        rr=[]; cur=None
        for x,v in seq:
            if v<70:
                if cur is None: cur=[x,x]
                else: cur[1]=x
            else:
                if cur is not None and cur[1]-cur[0]>int(20*c): rr.append(tuple(cur)); cur=None
                elif cur is not None: cur=None
        if cur is not None and cur[1]-cur[0]>int(20*c): rr.append(tuple(cur))
        if len(rr)==4:
            w=sum(b-a+1 for a,b in rr)
            if best is None or w>best[0]: best=(w,y,rr)
    if not best: print("    4 ronds NON trouves"); return
    _,y,rr = best
    print(f"    ligne de diametre maximal y={y} ({y/c:.2f} CSS)")
    for i,(a,b) in enumerate(rr):
        print(f"      rond {i+1}: x CSS[{a/c:.2f},{(b+1)/c:.2f}] diam={(b-a+1)/c:.2f} centre={((a+b+1)/2)/c:.2f}")
    cs=[((a+b+1)/2)/c for a,b in rr]
    print(f"      ecarts entre centres : {[round(cs[i+1]-cs[i],2) for i in range(3)]}   gouttiere = {round(cs[1]-cs[0]-(rr[0][1]-rr[0][0]+1)/c,2)} CSS")
    # extension verticale du rond 1
    xa=(rr[0][0]+rr[0][1])//2
    yt=y
    while yt>0 and lum(px[xa,yt-1])<70: yt-=1
    yb2=y
    while yb2<H-1 and lum(px[xa,yb2+1])<70: yb2+=1
    print(f"      rond 1 vertical : y CSS[{yt/c:.2f},{(yb2+1)/c:.2f}] h={(yb2-yt+1)/c:.2f}")
    print(f"      remplissage rond 1 : haut-gauche {hexc(med_window(im,rr[0][0]+int(14*c),yt+int(12*c),3))}  centre {hexc(med_window(im,xa,(yt+yb2)//2,3))}  bas-droit {hexc(med_window(im,rr[0][1]-int(12*c),yb2-int(10*c),3))}")
    print(f"      bord du rond 1 (profil horizontal a mi-hauteur) :", " ".join(f"{k:+d}:{hexc(px[rr[0][0]+k,(yt+yb2)//2])}" for k in range(-3,4)))
    # fond du dock : a gauche du 1er rond, a mi-hauteur des ronds ; et sous les libelles
    print(f"      FOND du dock a gauche du rond1 (x CSS 20) : {hexc(med_window(im,int(20*c),(yt+yb2)//2,4))}")
    print(f"      FOND du dock, y=+14CSS sous les ronds, x CSS 20 : {hexc(med_window(im,int(20*c),yb2+int(14*c),4))}")
    # libelles + pointe : bande sous les ronds
    bg = med_window(im,int(20*c),yb2+int(14*c),4)
    rows=rows_with_ink(im,int(30*c),yb2+1,int(362*c),min(H,yb2+int(34*c)),bg,20)
    for (a,b) in runs(rows, lambda n:n>4):
        cols=cols_with_ink(im,int(30*c),a,int(362*c),b+1,bg,20)
        cr=runs(cols, lambda n:n>0)
        if not cr: continue
        pts=[]
        for yy in range(a,b+1):
            for xx in range(cr[0][0],cr[-1][1]+1):
                p=px[xx,yy]; d=abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2])
                if d>60: pts.append((d,p))
        if not pts: continue
        pts.sort(key=lambda t:-t[0]); k=max(1,len(pts)//10); top=[p for d,p in pts[:k]]
        col=(int(statistics.median([p[0] for p in top])),int(statistics.median([p[1] for p in top])),int(statistics.median([p[2] for p in top])))
        grp=[]
        for u,v in cr:
            if v-u>=1:
                if grp and u<=grp[-1][1]+int(3*c): grp[-1][1]=v
                else: grp.append([u,v])
        print(f"      bande y CSS[{a/c:.2f},{(b+1)/c:.2f}] h={(b-a+1)/c:.2f} encre={hexc(col)} groupes={[(round(u/c,1),round((v+1)/c,1)) for u,v in grp]}")

dock(CANON,'CANON',(1830,2000))
print()
dock(CAP16,'CAP 1080x1920',(1700,1880))
print()
dock(CAP24,'CAP 1080x2400',(2150,2330))
