# -*- coding: utf-8 -*-
"""Arc du cadran : on le CHERCHE au lieu de le supposer. Carte des pixels 'teal'
(B>R+12) et 'braise' (R>B+25 et R>90) dans le medaillon, puis bbox + epaisseur."""
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def carte(path,label,cx,cy,ray):
    im=open_img(path); c=css(im); px=im.load()
    teal=[]; braise=[]
    for y in range(int((cy-ray)*c),int((cy+ray)*c)):
        for x in range(int((cx-ray)*c),int((cx+ray)*c)):
            q=px[x,y]
            dx=(x/c-cx); dy=(y/c-cy)
            if dx*dx+dy*dy > (ray-1.5)**2: continue
            if q[2]>q[0]+34 and q[2]>95: teal.append((x/c,y/c,q))
            if q[0]>q[2]+55 and q[0]>125: braise.append((x/c,y/c,q))
    for nom,pts in (('teal',teal),('braise',braise)):
        if not pts: print(f"  {label} {nom}: AUCUN"); continue
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        rr=[math.hypot(p[0]-cx,p[1]-cy) for p in pts]
        import statistics as st
        print(f"  {label} {nom}: n={len(pts)} bbox x[{min(xs):.1f},{max(xs):.1f}] y[{min(ys):.1f},{max(ys):.1f}] "
              f"rayon min={min(rr):.1f} max={max(rr):.1f} med={st.median(rr):.1f} epaisseur={max(rr)-min(rr):.1f} CSS ; "
              f"couleur mediane={hexc((int(st.median([p[2][0] for p in pts])),int(st.median([p[2][1] for p in pts])),int(st.median([p[2][2] for p in pts]))))}")

print("canon : medaillon centre (195.83,40.0) r=32 ; svg .cadran 44x28, arc r=26 dans viewBox 60x40")
carte(CANON,'canon',195.83,40.0,31)
carte(CAP16,'cap16',195.82,40.29,33)
carte(CAP24,'cap24',195.82,40.29,33)
