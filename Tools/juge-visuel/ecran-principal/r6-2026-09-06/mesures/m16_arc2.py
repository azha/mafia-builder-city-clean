# m16 — epaisseur radiale de l'arc par angle, couleurs medianes, pivot, aiguille
from lib import *
import math, json
C=json.load(open('centres.json'))
def classify(c):
    r,g,b=c
    if g>r+8 and b>r+8 and g>45: return 'teal'
    if r>g+25 and r>b+25 and r>70: return 'braise'
    return None
def collect(im,cx,cy,R):
    out={'teal':[], 'braise':[]}
    for y in range(int(cy-R),int(cy+R)):
        for x in range(int(cx-R),int(cx+R)):
            if not(0<=x<im.size[0] and 0<=y<im.size[1]): continue
            dx=x-cx; dy=y-cy; rr=math.hypot(dx,dy)/R
            if rr>0.75 or rr<0.30: continue
            th=(math.degrees(math.atan2(-dy,dx)))%360
            k=classify(im.getpixel((x,y)))
            if k: out[k].append((rr,th,im.getpixel((x,y))))
    return out
def thickness(pts,angles,label,R,s):
    print(f"     {label} — epaisseur radiale (convention : extension du masque de classe)")
    for a in angles:
        sel=[p[0] for p in pts if abs(((p[1]-a+180)%360)-180)<1.5]
        if len(sel)<3: print(f"        {a:4d} deg : (vide)"); continue
        e=(max(sel)-min(sel))
        print(f"        {a:4d} deg : r/R {min(sel):.3f}..{max(sel):.3f}  ep={e:.4f} R = {e*R/s:.2f} CSS  (n={len(sel)})")
def med_col(pts,label):
    if not pts: print(f"     {label}: vide"); return
    cols=[p[2] for p in pts]
    m=tuple(int(median([c[k] for c in cols])) for k in range(3))
    print(f"     {label}: couleur mediane {m}  L={lum(m):.1f}  n={len(cols)}")
    return m

print("== m16 arc : epaisseur + couleur ==")
r=load(REF); d=load(DIS24)
for im,key,s,nm in [(r,'ref',S_REF,'REFERENCE'),(d,'dis24',S_CAP,'JEU district 2400')]:
    cx,cy,R=C[key]
    print(f"  --- {nm} ---")
    b=collect(im,cx,cy,R)
    med_col(b['teal'],'teal'); med_col(b['braise'],'braise')
    thickness(b['teal'],[100,120,140,160,180],'teal',R,s)
    thickness(b['braise'],[10,20,30,40],'braise',R,s)
