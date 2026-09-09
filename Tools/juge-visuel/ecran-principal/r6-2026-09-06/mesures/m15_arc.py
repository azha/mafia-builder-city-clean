# m15 — arc du cadran : classes de couleur, extension angulaire, segment NEUTRE, rayons, epaisseur
# Convention : angles en degres, 0 = a droite, croissants dans le SENS TRIGO (haut = +90).
# Rayon exprime en fraction du rayon du boitier R (pic du cerclage, m13).
from lib import *
import math, json
C=json.load(open('centres.json'))

def classify(c):
    r,g,b=c
    if g>r+8 and b>r+8 and g>45: return 'teal'
    if r>g+25 and r>b+25 and r>70: return 'braise'
    return None

def polar(cx,cy,x,y,R):
    dx=x-cx; dy=y-cy
    return math.hypot(dx,dy)/R, (math.degrees(math.atan2(-dy,dx)))%360

def scan(im,cx,cy,R,s,label):
    print(f"  --- {label} (centre px {cx:.1f};{cy:.1f}, R={R:.1f}px={R/s:.2f}CSS) ---")
    buckets={}
    for y in range(int(cy-R),int(cy+R)):
        for x in range(int(cx-R),int(cx+R)):
            if not(0<=x<im.size[0] and 0<=y<im.size[1]): continue
            rr,th=polar(cx,cy,x,y,R)
            if rr>0.75 or rr<0.30: continue
            k=classify(im.getpixel((x,y)))
            if k: buckets.setdefault(k,[]).append((rr,th))
    for k in ('teal','braise'):
        pts=buckets.get(k,[])
        if not pts: print(f"     {k}: 0 px"); continue
        rs=[p[0] for p in pts]; ths=[p[1] for p in pts]
        print(f"     {k}: n={len(pts)}  rayon/R median={median(rs):.4f}  min={min(rs):.3f} max={max(rs):.3f}")
        # extension angulaire : histogramme 1 deg
        occ=sorted(set(int(t) for t in ths))
        # segments contigus
        segs=[];cur=[occ[0]]
        for a in occ[1:]:
            if a-cur[-1]<=2: cur.append(a)
            else: segs.append((cur[0],cur[-1])); cur=[a]
        segs.append((cur[0],cur[-1]))
        print(f"        secteurs angulaires (deg): {segs}")
    # segment NEUTRE : entre la fin du teal et le debut du braise, au sommet
    return buckets

print("== m15 arc du cadran ==")
r=load(REF); d=load(DIS24); c19=load(CAP19)
br=scan(r,C['ref'][0],C['ref'][1],C['ref'][2],S_REF,'REFERENCE')
bd=scan(d,C['dis24'][0],C['dis24'][1],C['dis24'][2],S_CAP,'JEU district 2400')
bc=scan(c19,C['cap19'][0],C['cap19'][1],C['cap19'][2],S_CAP,'JEU fiche 1920')
