# Grandeur DUE : moyeu (bbox, centre), longueur de l'AIGUILLE mesuree DEPUIS LE MOYEU / R,
#                rayon de la POINTE / R, et bande radiale de l'arc AU MEME ANGLE (pointe dedans/dessus/au-dela).
# Controle positif : REF angle de l'aiguille depuis le moyeu doit rendre ~ -42 deg (CSS rotate(-42deg)).
from common import *
import math
def moyeu(im,cx,cy,scale,label,rmax,cible=(176,141,62),tol=45):
    px=im.load(); pts=[]
    for y in range(int(cy-rmax),int(cy+rmax)):
        for x in range(int(cx-rmax),int(cx+rmax)):
            c=px[x,y]
            if all(abs(c[i]-cible[i])<tol for i in range(3)) and math.hypot(x-cx,y-cy)<rmax:
                pts.append((x,y))
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    hx=(min(xs)+max(xs))/2; hy=(min(ys)+max(ys))/2
    print(f'  {label} moyeu : {len(pts)} px ; x {min(xs)}..{max(xs)} y {min(ys)}..{max(ys)} ; diam {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px = {(max(xs)-min(xs)+1)/scale:.2f}x{(max(ys)-min(ys)+1)/scale:.2f} CSS ; centre ({hx:.1f},{hy:.1f})')
    return hx,hy
def creme(im,box,cx,cy,R,excl_r):
    px=im.load(); pts=[]
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            c=px[x,y]
            if c[0]>195 and c[1]>185 and c[2]>160 and abs(c[0]-c[2])<60:
                d=math.hypot(x-cx,y-cy)
                if excl_r<d<R*0.95: pts.append((x,y,d))
    return pts
def arc_bande(im,cx,cy,ang,R,scale,label):
    px=im.load(); A=math.radians(ang); hits=[]
    r=R*0.15
    while r<R*0.85:
        x=int(round(cx+r*math.sin(A))); y=int(round(cy-r*math.cos(A))); c=px[x,y]
        sat=(max(c)-min(c))/max(1,max(c))
        if lum(c)>45 and sat>0.15: hits.append((r,c))
        r+=0.5
    if hits:
        print(f'    arc a {ang:+.1f} deg : r {hits[0][0]:.1f}..{hits[-1][0]:.1f} px = {hits[0][0]/R:.3f}..{hits[-1][0]/R:.3f} R ; couleur mediane {hits[len(hits)//2][1]}')
        return hits[0][0]/R,hits[-1][0]/R
    print(f'    arc a {ang:+.1f} deg : rien'); return None
print('===== REFERENCE (R=95.5 px = 31.83 CSS) =====')
r=op(REF); RCX,RCY,RR=587.5,116.5,95.5
hx,hy=moyeu(r,RCX,RCY,REF_S,'REF',40)
pts=creme(r,(int(RCX-RR),int(RCY-RR),int(RCX+RR),int(RCY)),RCX,RCY,RR,0)
pts.sort(key=lambda p:-math.hypot(p[0]-hx,p[1]-hy)); tip=pts[0]
L=math.hypot(tip[0]-hx,tip[1]-hy); ang=math.degrees(math.atan2(tip[0]-hx,hy-tip[1]))
rp=math.hypot(tip[0]-RCX,tip[1]-RCY)
print(f'  REF aiguille : pointe ({tip[0]},{tip[1]}) ; LONGUEUR depuis moyeu {L:.1f} px = {L/REF_S:.2f} CSS = {L/RR:.4f} R ; angle {ang:+.1f} deg')
print(f'    CONTROLE POSITIF : angle attendu -42 deg (CSS rotate(-42deg)) ; ecart {ang+42:+.1f} deg')
print(f'  REF rayon de la POINTE depuis le centre du boitier : {rp:.1f} px = {rp/RR:.4f} R')
arc_bande(r,RCX,RCY,ang,RR,REF_S,'REF')
print('===== CAPTURE 2400 (R=110.5 px = 40.11 CSS) =====')
c=op(C24); CCX,CCY,CR=539.5,130.0,110.5
hx2,hy2=moyeu(c,CCX,CCY,CAP_S,'CAP',45)
pts2=creme(c,(int(CCX-CR),int(CCY-CR),int(CCX+CR),int(CCY+10)),CCX,CCY,CR,0)
pts2.sort(key=lambda p:-math.hypot(p[0]-hx2,p[1]-hy2)); tip2=pts2[0]
L2=math.hypot(tip2[0]-hx2,tip2[1]-hy2); ang2=math.degrees(math.atan2(tip2[0]-hx2,hy2-tip2[1]))
rp2=math.hypot(tip2[0]-CCX,tip2[1]-CCY)
print(f'  CAP aiguille : pointe ({tip2[0]},{tip2[1]}) ; LONGUEUR depuis moyeu {L2:.1f} px = {L2/CAP_S:.2f} CSS = {L2/CR:.4f} R ; angle {ang2:+.1f} deg')
print(f'  CAP rayon de la POINTE depuis le centre du boitier : {rp2:.1f} px = {rp2/CR:.4f} R')
arc_bande(c,CCX,CCY,ang2,CR,CAP_S,'CAP')
