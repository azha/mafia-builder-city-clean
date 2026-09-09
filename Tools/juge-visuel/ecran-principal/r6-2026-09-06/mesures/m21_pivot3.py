# m21 — pivot : masque serre sur (176,141,62) +-18/canal, dans r<0.45R
from lib import *
import math, json
C=json.load(open('centres.json'))
TGT=(176,141,62)
def pivot(im,cx,cy,R,s,label):
    pts=[]
    for y in range(int(cy-0.45*R),int(cy+0.45*R)):
        for x in range(int(cx-0.45*R),int(cx+0.45*R)):
            c=im.getpixel((x,y))
            if all(abs(c[k]-TGT[k])<=18 for k in range(3)): pts.append((x,y))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    if len(pts)<10: print(f"    {label}: n={len(pts)} insuffisant"); return None
    cxp=(min(xs)+max(xs))/2.0; cyp=(min(ys)+max(ys))/2.0
    dx=(max(xs)-min(xs))+1; dy=(max(ys)-min(ys))+1
    print(f"    {label}: n={len(pts)}  bbox {dx}x{dy} px = {dx/s:.2f}x{dy/s:.2f} CSS  centre px ({cxp:.2f};{cyp:.2f})")
    print(f"       offset / centre du boitier : dx={(cxp-cx)/s:+.2f} CSS  dy={(cyp-cy)/s:+.2f} CSS "
          f"= {(cyp-cy)/R:+.4f} R vertical  [+ = SOUS le centre]")
    return cxp,cyp
print("== m21 pivot (masque serre laiton) ==")
r=load(REF); d=load(DIS24); c=load(CAP19)
pr=pivot(r,*C['ref'],S_REF,'REFERENCE')
pd=pivot(d,*C['dis24'],S_CAP,'JEU district 2400')
pc=pivot(c,*C['cap19'],S_CAP,'JEU fiche 1920')

# aiguille : creme #eae0c8
print("\n== aiguille (creme (234,224,200) +-30) ==")
def needle(im,cx,cy,R,s,pv,label):
    pts=[]
    for y in range(int(cy-0.8*R),int(cy+0.8*R)):
        for x in range(int(cx-0.8*R),int(cx+0.8*R)):
            rr=math.hypot(x-cx,y-cy)/R
            if rr>0.75: continue
            c=im.getpixel((x,y))
            if all(abs(c[k]-(234,224,200)[k])<=30 for k in range(3)): pts.append((x,y))
    if len(pts)<20: print(f"    {label}: n={len(pts)} insuffisant"); return
    far=max(pts,key=lambda p:math.hypot(p[0]-pv[0],p[1]-pv[1]))
    L=math.hypot(far[0]-pv[0],far[1]-pv[1])
    ang=math.degrees(math.atan2(-(far[1]-pv[1]),far[0]-pv[0]))%360
    # epaisseur : largeur mediane perpendiculaire -> approx par n/L
    print(f"    {label}: n={len(pts)}  pointe a {L/s:.2f} CSS du pivot, angle {ang:.1f} deg, "
          f"epaisseur moyenne ~{len(pts)/max(L,1)/s:.2f} CSS")
if pr: needle(r,*C['ref'],S_REF,pr,'REFERENCE (37% : aiguille + texte creme melanges)')
if pd: needle(d,*C['dis24'],S_CAP,pd,'JEU 2400')
