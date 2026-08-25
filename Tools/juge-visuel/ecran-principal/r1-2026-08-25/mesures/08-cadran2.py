# -*- coding: utf-8 -*-
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75

def anneau(im, cxg, ytop, ybot, excl, tag):
    px=im.load(); pts=[]
    for y in range(ytop,ybot):
        if excl[0]<=y<=excl[1]: continue
        xs=[x for x in range(cxg-150,cxg+150) if est_or(px[x,y])]
        grp=[]
        for x in xs:
            if grp and x==grp[-1][-1]+1: grp[-1].append(x)
            else: grp.append([x])
        if len(grp)>=2:
            pts.append((y,grp[0][0],grp[-1][-1],len(grp)))
    if not pts: print(f"[{tag}] rien"); return None
    best=max(pts,key=lambda p:p[2]-p[1])
    ys=[p[0] for p in pts]
    cx=(best[1]+best[2])/2.0; d=best[2]-best[1]+1
    cy=(min(ys)+max(ys))/2.0; dv=max(ys)-min(ys)+1
    print(f"[{tag}] diam horizontal max = {d} px a y={best[0]} (x {best[1]}..{best[2]}), cx={cx:.1f}")
    print(f"        etendue verticale {min(ys)}..{max(ys)} -> diam vertical {dv} px, cy={cy:.1f}")
    return cx,cy,d,dv

def polaire(im,cx,cy,r,tag,pas=2):
    px=im.load()
    def cls(c):
        r_,g_,b_=c
        if g_>r_+15 and g_>60: return 'T'
        if r_>g_+28 and r_>b_+22 and r_>85: return 'R'
        if max(c)-min(c)<30 and sum(c)/3>52: return 'g'
        return '.'
    seq=[]
    for a in range(-110,111,pas):
        rad=math.radians(a); x=cx+r*math.sin(rad); y=cy-r*math.cos(rad)
        seq.append((a,px[int(round(x)),int(round(y))]))
    print(f"[{tag}] polaire r={r:.1f} centre({cx:.1f},{cy:.1f})  (0=haut, +=vers la droite)")
    print("      "+''.join(cls(c) for a,c in seq)+"   [-110..+110 pas 2]")
    cur=None;deb=None
    for i,(a,c) in enumerate(seq):
        k=cls(c)
        if k!=cur:
            if cur in 'TRg': print(f"        segment {cur}: {deb:+4d}deg .. {seq[i-1][0]:+4d}deg")
            cur=k;deb=a
    if cur in 'TRg': print(f"        segment {cur}: {deb:+4d}deg .. {seq[-1][0]:+4d}deg")
    # couleurs medianes des zones
    for a0,a1,nom in [(-50,-30,'T milieu'),(30,50,'R milieu')]:
        cs=[c for a,c in seq if a0<=a<=a1]
        cs_s=sorted(cs,key=lambda c:sum(c)); print(f"        couleur mediane {nom}: {cs_s[len(cs_s)//2]}")
    return seq

K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
print("\n===== CANON =====")
k=anneau(K,588,15,235,(148,160),'canon anneau')
print("\n===== CAPTURE 1080x1920 =====")
c=anneau(C,540,8,205,(124,138),'c19 anneau')
