# Grandeur : position/taille des textes du medaillon, et debordement hors du boitier.
# REF : "37%" (.heatpct 13px) + "HEAT" (.heatlib 7px). CAP : "Brulant" + "CHALEUR".
# Repere : REF centre (587.5,116.5) R=95.5 ; CAP centre (539.5,130.0) R=110.5.
from txt import *
import math
def textes(im,cx,cy,R,scale,label,seuil=55):
    box=(int(cx-R*0.95),int(cy-R*0.2),int(cx+R*0.95),int(cy+R*1.15))
    px=im.load(); x0,y0,x1,y1=box
    base=sorted([lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)])[int(0.3*(y1-y0)*(x1-x0))]
    print(f'  {label} (fond L={base:.0f}) — y relatif au CENTRE du boitier, en R')
    cur=None
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if lum(px[x,y])-base>seuil and math.hypot(x-cx,y-cy)<R*1.02]
        if xs:
            if cur is None: cur=[y,y,min(xs),max(xs)]
            else: cur[1]=y; cur[2]=min(cur[2],min(xs)); cur[3]=max(cur[3],max(xs))
        else:
            if cur and cur[1]-cur[0]>2:
                print(f'     bande y {cur[0]}..{cur[1]} = ({cur[0]-cy:+.0f}..{cur[1]-cy:+.0f} px) = {(cur[0]-cy)/R:+.3f}..{(cur[1]-cy)/R:+.3f} R ; hauteur {(cur[1]-cur[0]+1)/scale:5.2f} CSS ; x {(cur[2]-cx)/R:+.3f}..{(cur[3]-cx)/R:+.3f} R ; largeur {(cur[3]-cur[2]+1)/scale:6.2f} CSS ; centre x {(cur[2]+cur[3])/2-cx:+.1f} px')
            cur=None
    if cur and cur[1]-cur[0]>2:
        print(f'     bande y {cur[0]}..{cur[1]} = ({cur[0]-cy:+.0f}..{cur[1]-cy:+.0f} px) = {(cur[0]-cy)/R:+.3f}..{(cur[1]-cy)/R:+.3f} R ; hauteur {(cur[1]-cur[0]+1)/scale:5.2f} CSS ; x {(cur[2]-cx)/R:+.3f}..{(cur[3]-cx)/R:+.3f} R ; largeur {(cur[3]-cur[2]+1)/scale:6.2f} CSS')
r=op(REF); textes(r,587.5,116.5,95.5,REF_S,'REF medaillon')
c=op(C24); textes(c,539.5,130.0,110.5,CAP_S,'CAP2400 medaillon')
