# Meme grandeur, restreinte a l'INTERIEUR du boitier (r<0.85 R) et au creme clair (L>150).
from common import *
import math
def textes(im,cx,cy,R,scale,label):
    px=im.load(); cur=None; out=[]
    for y in range(int(cy-R),int(cy+R)):
        xs=[x for x in range(int(cx-R),int(cx+R))
            if math.hypot(x-cx,y-cy)<R*0.86 and lum(px[x,y])>150 and px[x,y][0]>150 and px[x,y][2]>120]
        if xs:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur and cur[1]-cur[0]>=3: out.append(tuple(cur))
            cur=None
    if cur and cur[1]-cur[0]>=3: out.append(tuple(cur))
    print(f'  {label} (centre {cx},{cy} R={R})')
    for y0,y1,a,b in out:
        print(f'     texte : hauteur {(y1-y0+1)/scale:5.2f} CSS ; haut {(y0-cy)/R:+.3f} R  bas {(y1-cy)/R:+.3f} R ; largeur {(b-a+1)/scale:6.2f} CSS ; centre x {(a+b)/2-cx:+.1f} px ; x {(a-cx)/R:+.3f}..{(b-cx)/R:+.3f} R')
    return out
r=op(REF); textes(r,587.5,116.5,95.5,REF_S,'REF ("37%" puis "HEAT")')
c=op(C24); textes(c,539.5,130.0,110.5,CAP_S,'CAP2400 ("Brulant" puis "CHALEUR")')
t=op(T24); textes(t,539.5,105.0,93.5,CAP_S,'TEMOIN famille')
