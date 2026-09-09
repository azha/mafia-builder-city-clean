# m36 — libelles du manometre, pixels RESTREINTS au disque du medaillon (r<0.90 R)
# Controle NEGATIF de la version precedente : sans le masque, la sonde attrapait les NUAGES de l'art.
from lib import *
import math, json
C=json.load(open('centres.json'))
def box(im,cx,cy,R,y0,y1,s,label,rel=0.5):
    cand=[(x,y) for y in range(y0,y1) for x in range(int(cx-0.92*R),int(cx+0.92*R))
          if math.hypot(x-cx,y-cy)<0.90*R]
    ls=[lum(im.getpixel(p)) for p in cand]
    srt=sorted(ls); bg=srt[len(srt)//3]; pk=srt[-max(1,len(srt)//120)]
    thr=bg+rel*(pk-bg)
    pts=[p for p in cand if lum(im.getpixel(p))>=thr]
    if not pts: print(f"    {label}: RIEN"); return None
    X0,X1,Y0,Y1=min(p[0] for p in pts),max(p[0] for p in pts),min(p[1] for p in pts),max(p[1] for p in pts)
    mx=max(lum(im.getpixel(q)) for q in pts)
    core=[p for p in pts if lum(im.getpixel(p))>=0.97*mx]
    col=tuple(int(median([im.getpixel(p)[k] for p in core])) for k in range(3))
    d=max(math.hypot(x-cx,y-cy) for x in (X0,X1) for y in (Y0,Y1))
    print(f"    {label}: CSS x {X0/s:.2f}..{X1/s:.2f} (l={(X1-X0+1)/s:.2f}) y {Y0/s:.2f}..{Y1/s:.2f} (h={(Y1-Y0+1)/s:.2f}) "
          f"centre x={(X0+X1)/2/s:.2f} | couleur coeur {col} | coin le plus loin = {d/R:.3f} R | n={len(pts)}")
    return X0,Y0,X1,Y1,d/R
print("== m36 libelles du manometre (masque medaillon) ==")
c=load(CAP19); r=load(REF); d24=load(DIS24)
rc=C['ref']; cc=C['cap19']; dc=C['dis24']
print(f"  centre du boitier : REF x={rc[0]/S_REF:.2f} CSS  JEU x={cc[0]/S_CAP:.2f} CSS")
box(r,*rc,88,140,S_REF,'REF « 37% »')
box(r,*rc,142,172,S_REF,'REF « HEAT »')
box(c,*cc,112,155,S_CAP,'JEU « Brulant » (1920)')
box(c,*cc,152,185,S_CAP,'JEU « CHALEUR » (1920)')
box(d24,*dc,112,155,S_CAP,'JEU « Brulant » (district 2400)')
box(d24,*dc,152,185,S_CAP,'JEU « CHALEUR » (district 2400)')
