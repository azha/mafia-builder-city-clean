# Profils radiaux BRUTS pour identifier les couleurs reelles de l'arc (teal / braise) et de l'anneau.
from common import *
import math
def prof(im,cx,cy,a,R,scale,label):
    px=im.load(); A=math.radians(a); print(f'  {label} angle {a:+d} deg'); prev=None
    r=0.0
    while r<R*1.05:
        x=int(round(cx+r*math.sin(A))); y=int(round(cy-r*math.cos(A)))
        c=px[x,y]
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>12:
            print(f'     r={r:6.1f} px ({r/scale:5.2f} CSS, {r/R:.3f} R)  {c}')
        prev=c; r+=1.0
r=op(REF)
for a in (-60,-30,0,30,60): prof(r,587.5,116.5,a,95.5,REF_S,'REF')
c=op(C24)
for a in (-60,-30,0,30,60): prof(c,539.5,130.0,a,110.5,CAP_S,'CAP2400')
