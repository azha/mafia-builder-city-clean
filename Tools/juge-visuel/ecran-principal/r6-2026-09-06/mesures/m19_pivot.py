# m19 — pivot (disque laiton) et aiguille (creme) : position, taille, angle
from lib import *
import math, json
C=json.load(open('centres.json'))
def pivot(im,cx,cy,R,s,label):
    pts=[]
    for y in range(int(cy-0.45*R),int(cy+0.45*R)):
        for x in range(int(cx-0.45*R),int(cx+0.45*R)):
            r,g,b=im.getpixel((x,y))
            if r-b>45 and r>110 and g>60 and g<r-25: pts.append((x,y))
    if not pts: print(f"    {label} pivot : 0 px"); return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    px_,py_=sum(xs)/len(xs),sum(ys)/len(ys)
    d=((max(xs)-min(xs))+(max(ys)-min(ys)))/2.0
    print(f"    {label} pivot : n={len(pts)} centroide px ({px_:.2f};{py_:.2f})  diametre~{d:.1f}px={d/s:.2f}CSS")
    print(f"       offset / centre du boitier : dx={(px_-cx)/s:+.2f} CSS  dy={(py_-cy)/s:+.2f} CSS "
          f"= {(px_-cx)/R:+.4f} R (x), {(py_-cy)/R:+.4f} R (y)   [dy>0 = SOUS le centre]")
    return px_,py_,d
def needle(im,cx,cy,R,s,label,pv):
    pts=[]
    for y in range(int(cy-0.75*R),int(cy+0.75*R)):
        for x in range(int(cx-0.75*R),int(cx+0.75*R)):
            r,g,b=im.getpixel((x,y))
            rr=math.hypot(x-cx,y-cy)/R
            if rr>0.72: continue
            if r>195 and g>185 and b>160 and abs(r-g)<28 and r-b<48 and r-b>4: pts.append((x,y))
    if len(pts)<20: print(f"    {label} aiguille : {len(pts)} px (insuffisant / masquee par du texte)"); return
    # longueur depuis le pivot
    ds=[math.hypot(p[0]-pv[0],p[1]-pv[1]) for p in pts]
    far=max(pts,key=lambda p:math.hypot(p[0]-pv[0],p[1]-pv[1]))
    ang=math.degrees(math.atan2(-(far[1]-pv[1]),far[0]-pv[0]))%360
    print(f"    {label} aiguille : n={len(pts)}  longueur max depuis le pivot = {max(ds)/s:.2f} CSS  angle de la pointe = {ang:.1f} deg")
print("== m19 pivot + aiguille ==")
r=load(REF); d=load(DIS24)
for im,key,s,nm in [(r,'ref',S_REF,'REFERENCE'),(d,'dis24',S_CAP,'JEU 2400')]:
    cx,cy,R=C[key]
    p=pivot(im,cx,cy,R,s,nm)
    if p: needle(im,cx,cy,R,s,nm,p)
