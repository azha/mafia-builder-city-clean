# m41 — aiguille : masque creme, quadrant HAUT (y < pivot), r<0.80R, hors boites de libelles
from lib import *
import math, json
C=json.load(open('centres.json'))
PIV={'ref':(587.5,130.5),'dis24':(539.5,96.0)}
def creme(c): return all(abs(c[k]-(234,224,200)[k])<=36 for k in range(3))
def run(im,key,s,label,ybandes):
    cx,cy,R=C[key]; pv=PIV[key]
    pts=[]
    for y in range(int(cy-0.85*R),int(pv[1])):
        for x in range(int(cx-0.85*R),int(cx+0.85*R)):
            if math.hypot(x-cx,y-cy)>0.80*R: continue
            if any(a<=y<=b for a,b in ybandes): continue
            if creme(im.getpixel((x,y))): pts.append((x,y))
    if not pts: print(f"    {label}: 0 px"); return
    far=max(pts,key=lambda p:math.hypot(p[0]-pv[0],p[1]-pv[1]))
    L=math.hypot(far[0]-pv[0],far[1]-pv[1])
    ang=math.degrees(math.atan2(-(far[1]-pv[1]),far[0]-pv[0]))%360
    # epaisseur : compte / longueur
    print(f"    {label}: n={len(pts)} px  pointe a {L:.1f} px = {L/s:.2f} CSS du pivot, angle {ang:.1f} deg")
    print(f"       epaisseur moyenne = n/L = {len(pts)/L:.2f} px = {len(pts)/L/s:.2f} CSS ; "
          f"longueur en R = {L/R:.3f}")
print("== m41 aiguille (quadrant au-dessus du pivot) ==")
r=load(REF); d=load(DIS24)
# canon : exclure la bande du « 37% » (y px 95..135)
run(r,'ref',S_REF,'REFERENCE (bande 37% exclue)',[(95,135)])
run(d,'dis24',S_CAP,'JEU district 2400',[])
