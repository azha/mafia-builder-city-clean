# Grandeur : la couleur de l'arc angle par angle (bouts compris) — cherche une piste "grise" aux extremites.
from common import *
import math
def sweep_couleur(im,cx,cy,R,scale,label,rmid=0.45):
    px=im.load(); print(f'  {label}')
    for a in range(-100,101,5):
        A=math.radians(a)
        best=None
        r=R*0.30
        while r<R*0.62:
            x=int(round(cx+r*math.sin(A))); y=int(round(cy-r*math.cos(A))); c=px[x,y]
            if best is None or lum(c)>lum(best[1]): best=(r,c)
            r+=0.5
        c=best[1]; mx,mn=max(c),min(c); sat=0 if mx==0 else (mx-mn)/mx
        print(f'    {a:+4d} deg : r={best[0]/R:.3f} R  {c}  L={lum(c):5.1f} sat={sat:.2f}')
c=op(C24); sweep_couleur(c,539.5,130.0,110.5,CAP_S,'CAP2400 arc, couleur la + claire dans 0.30..0.62 R')
print()
r=op(REF); sweep_couleur(r,587.5,116.5,95.5,REF_S,'REF arc')
