# Profil radial BRUT depuis le pivot, a l'angle exact de l'aiguille, sur les deux images.
from common import *
import math
def prof(im,hx,hy,ang,R,scale,label):
    px=im.load(); A=math.radians(ang); print(f'  {label} angle {ang:+.1f} deg depuis le pivot')
    r=R*0.15; prev=None
    while r<R*0.75:
        x=int(round(hx+r*math.sin(A))); y=int(round(hy-r*math.cos(A))); c=px[x,y]
        if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>10:
            print(f'     r={r/scale:6.2f} CSS ({r/R:.4f} R)  {c}')
        prev=c; r+=0.5
r=op(REF); prof(r,587.5,130.5,-41.6,95.5,REF_S,'REF')
print('   (pointe de l aiguille a 15.83 CSS = 0.4974 R)')
c=op(C24); prof(c,539.5,114.0,61.9,110.5,CAP_S,'CAP2400')
print('   (pointe de l aiguille a 15.43 CSS = 0.3846 R)')
