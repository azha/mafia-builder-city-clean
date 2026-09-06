# MESURE DUE, refaite avec la BONNE origine : le centre de l'arc est le MOYEU (SVG: arc et pivot en 30,34),
# pas le centre du boitier. R = rayon exterieur nominal du boitier.
# Attendus deduits du SVG du canon (viewBox 60x40 -> .cadran 44x28 CSS, facteur 0,7333 ; boitier 64 CSS) :
#   rayon d'arc 26*0,7333 = 19,07 CSS = 0,596 R ; epaisseur 3,5*0,7333 = 2,57 CSS = 0,0802 R ;
#   aiguille 22*0,7333 = 16,13 CSS = 0,504 R ; moyeu r 2,6*0,7333 = 1,91 CSS.
# CONTROLE POSITIF : la mesure image du canon doit retrouver ces nombres.
from common import *
import math
def sweep(im,hx,hy,R,scale,label,rmin=0.20,rmax=0.90):
    px=im.load(); segs=[]; cov={}
    for a in range(-115,116):
        A=math.radians(a); hit=None
        r=R*rmin
        while r<R*rmax:
            x=int(round(hx+r*math.sin(A))); y=int(round(hy-r*math.cos(A))); c=px[x,y]
            mx,mn=max(c),min(c); sat=0 if mx==0 else (mx-mn)/mx
            if sat>0.22 and mx>70:
                if hit is None: hit=[r,r,c]
                else: hit[1]=r; hit[2]=c
            r+=0.25
        cov[a]=hit
    cur=None
    for a in range(-115,116):
        if cov[a]:
            if cur is None: cur=[a,a]
            else: cur[1]=a
        else:
            if cur: segs.append(tuple(cur)); cur=None
    if cur: segs.append(tuple(cur))
    print(f'  {label} (origine = MOYEU, R boitier = {R:.1f} px = {R/scale:.2f} CSS)')
    for s in segs:
        mids=sorted((cov[a][0]+cov[a][1])/2 for a in range(s[0],s[1]+1))
        eps=sorted(cov[a][1]-cov[a][0] for a in range(s[0],s[1]+1))
        cc=cov[(s[0]+s[1])//2][2]
        m=mids[len(mids)//2]; e=eps[len(eps)//2]
        print(f'     {s[0]:+4d}..{s[1]:+4d} deg  rayon med {m/scale:6.2f} CSS = {m/R:.4f} R ; epaisseur {e/scale:5.2f} CSS = {e/R:.4f} R ; couleur {cc}')
    print(f'     TROUS : {[(segs[i][1]+1,segs[i+1][0]-1) for i in range(len(segs)-1)] or "aucun"}')
    return segs
print('===== REFERENCE : moyeu (587.5,130.5), R boitier 95.5 px =====')
r=op(REF); sweep(r,587.5,130.5,95.5,REF_S,'REF')
print('   piste neutre du canon (#ffffff22) a +15 deg, au rayon 0,596 R :')
px=r.load()
for a in (10,15,20,25):
    A=math.radians(a); rr=0.596*95.5
    x=int(round(587.5+rr*math.sin(A))); y=int(round(130.5-rr*math.cos(A)))
    print(f'      {a:+3d} deg -> ({x},{y}) = {px[x,y]}')
print('===== CAPTURE 2400 : moyeu (539.5,114.0), R boitier 110.5 px =====')
c=op(C24); sweep(c,539.5,114.0,110.5,CAP_S,'CAP')
print('   AIGUILLE, longueur depuis le moyeu / R et rayon de la pointe / rayon d arc :')
