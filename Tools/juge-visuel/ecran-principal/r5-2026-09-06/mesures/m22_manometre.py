# Instrument consolide du manometre. Convention de bord declaree : NOMINALE (mi-amplitude).
# R = rayon exterieur nominal de l'anneau du boitier.
# Controles : (+) REF diam boitier 64,00 CSS et angle d'aiguille -42 deg ; (-) le detecteur d'arc DOIT
#             rendre un TROU angulaire sur la reference si la reference en a un.
from common import *
import math
def moyeu_cc(im,cx,cy,scale,label,rmax=30):
    """composante connexe or autour du point le + or proche du centre bas"""
    px=im.load()
    def isor(c): return c[0]>150 and c[1]>95 and c[2]<100 and c[0]>c[1]>c[2]
    seeds=[(x,y) for y in range(int(cy-rmax),int(cy+rmax)) for x in range(int(cx-rmax),int(cx+rmax)) if isor(px[x,y])]
    if not seeds: print(f'  {label}: pas de moyeu'); return None
    seeds.sort(key=lambda p:math.hypot(p[0]-cx,p[1]-cy))
    st=[seeds[0]]; vu=set(st)
    while st:
        x,y=st.pop()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            n=(x+dx,y+dy)
            if n in vu: continue
            if abs(n[0]-cx)<rmax and abs(n[1]-cy)<rmax and isor(px[n]):
                vu.add(n); st.append(n)
    xs=[p[0] for p in vu]; ys=[p[1] for p in vu]
    hx=(min(xs)+max(xs))/2; hy=(min(ys)+max(ys))/2
    print(f'  {label} MOYEU : {len(vu)} px ; {max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} px = {(max(xs)-min(xs)+1)/scale:.2f}x{(max(ys)-min(ys)+1)/scale:.2f} CSS ; centre ({hx:.1f},{hy:.1f})')
    return hx,hy
def sweep(im,cx,cy,R,scale,label):
    """couverture angulaire de l'arc : pour chaque degre, existe-t-il un pixel colore dans la bande 0.30..0.60 R ?"""
    px=im.load(); cov={}
    for a in range(-120,121):
        A=math.radians(a); found=None
        r=R*0.28
        while r<R*0.65:
            x=int(round(cx+r*math.sin(A))); y=int(round(cy-r*math.cos(A))); c=px[x,y]
            mx,mn=max(c),min(c); sat=0 if mx==0 else (mx-mn)/mx
            if sat>0.22 and mx>70:
                if found is None: found=[r,r,c]
                else: found[1]=r
            r+=0.5
        cov[a]=found
    # segments contigus
    segs=[];cur=None
    for a in range(-120,121):
        if cov[a]:
            if cur is None: cur=[a,a]
            else: cur[1]=a
        else:
            if cur: segs.append(tuple(cur)); cur=None
    if cur: segs.append(tuple(cur))
    print(f'  {label} COUVERTURE ANGULAIRE de l arc (0=haut, +=droite) :')
    for s in segs:
        mids=[(cov[a][0]+cov[a][1])/2 for a in range(s[0],s[1]+1)]
        eps=[cov[a][1]-cov[a][0] for a in range(s[0],s[1]+1)]
        cc=cov[(s[0]+s[1])//2][2]
        print(f'     {s[0]:+4d}..{s[1]:+4d} deg ({s[1]-s[0]+1:3d} deg) ; rayon med {sorted(mids)[len(mids)//2]/R:.4f} R ; epaisseur med {sorted(eps)[len(eps)//2]/R:.4f} R = {sorted(eps)[len(eps)//2]/scale:.2f} CSS ; couleur au milieu {cc}')
    trous=[]
    for i in range(len(segs)-1):
        trous.append((segs[i][1]+1,segs[i+1][0]-1))
    print(f'     TROUS : {trous if trous else "aucun"}')
    return segs
def aiguille(im,cx,cy,hx,hy,R,scale,label,ymax):
    px=im.load(); pts=[]
    for y in range(int(cy-R),int(ymax)):
        for x in range(int(cx-R),int(cx+R)):
            c=px[x,y]
            if c[0]>200 and c[1]>190 and c[2]>165 and math.hypot(x-cx,y-cy)<R*0.9:
                pts.append((x,y))
    if not pts: print(f'  {label}: pas d aiguille'); return
    pts.sort(key=lambda p:-math.hypot(p[0]-hx,p[1]-hy)); tip=pts[0]
    L=math.hypot(tip[0]-hx,tip[1]-hy); ang=math.degrees(math.atan2(tip[0]-hx,hy-tip[1]))
    rp=math.hypot(tip[0]-cx,tip[1]-cy)
    print(f'  {label} AIGUILLE : pointe ({tip[0]},{tip[1]}) ; longueur/R = {L/R:.4f} ({L/scale:.2f} CSS) ; angle {ang:+.1f} deg ; rayon de la POINTE = {rp/R:.4f} R ({rp/scale:.2f} CSS)')
    return L/R,ang,rp/R
print('===== REFERENCE : boitier 64,00 CSS, R=95.5 px =====')
r=op(REF); RCX,RCY,RR=587.5,116.5,95.5
h=moyeu_cc(r,RCX,RCY+14,REF_S,'REF',22)
sweep(r,RCX,RCY,RR,REF_S,'REF')
a=aiguille(r,RCX,RCY,h[0],h[1],RR,REF_S,'REF',RCY+2)
print(f'  CONTROLE POSITIF : angle attendu -42 deg -> ecart {a[1]+42:+.1f} deg')
print('===== CAPTURE 2400 : R=110.5 px =====')
c=op(C24); CCX,CCY,CR=539.5,130.0,110.5
h2=moyeu_cc(c,CCX,CCY-16,CAP_S,'CAP',22)
sweep(c,CCX,CCY,CR,CAP_S,'CAP')
aiguille(c,CCX,CCY,h2[0],h2[1],CR,CAP_S,'CAP',CCY+2)
