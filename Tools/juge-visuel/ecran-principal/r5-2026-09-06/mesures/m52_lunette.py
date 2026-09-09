# Grandeur : la "lunette" du canon (anneau interieur 1px #ffffff1e a inset 3px) existe-t-elle en jeu ?
# CONTROLE NEGATIF : la sonde doit la TROUVER sur la reference.
from common import *
import math
def prof(im,cx,cy,R,scale,label):
    px=im.load(); print(f'  {label} : profil radial MOYEN (24 angles) sur 0.80..1.00 R')
    for k in range(int(R*0.78),int(R*1.02)):
        vals=[]
        for a in range(0,360,15):
            A=math.radians(a); x=int(round(cx+k*math.sin(A))); y=int(round(cy-k*math.cos(A)))
            if 0<=x<im.width and 0<=y<im.height: vals.append(px[x,y])
        m=tuple(sorted(v[i] for v in vals)[len(vals)//2] for i in range(3))
        print(f'     r={k/R:.3f} R : median {m} L={lum(m):6.1f}')
r=op(REF); prof(r,587.5,116.5,95.5,REF_S,'REF (lunette attendue vers 0.906 R = inset 3 CSS)')
c=op(C24); prof(c,539.5,130.0,110.5,CAP_S,'CAP2400')
