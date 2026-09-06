# MESURE DUE (version finale). Origine = MOYEU. Detecteur par TEINTE (teal vs braise), pas par saturation.
# Attendus SVG du canon : preserveAspectRatio "meet" -> facteur min(44/60, 28/40) = 0,70
#   rayon d'arc 26*0,70 = 18,20 CSS = 0,569 R ; epaisseur 3,5*0,70 = 2,45 CSS = 0,0766 R
#   aiguille 22*0,70 = 15,40 CSS = 0,481 R ; moyeu 2*2,6*0,70 = 3,64 CSS
from common import *
import math
def teinte(c):
    mx,mn=max(c),min(c)
    if mx==mn: return None
    if mx==c[0]: h=(60*(((c[1]-c[2])/(mx-mn))%6))
    elif mx==c[1]: h=60*(((c[2]-c[0])/(mx-mn))+2)
    else: h=60*(((c[0]-c[1])/(mx-mn))+4)
    return h
def classe(c):
    h=teinte(c); mx=max(c)
    if h is None or mx<60: return None
    sat=(mx-min(c))/mx
    if 150<=h<=210 and sat>0.15 and c[1]>c[0]+15: return 'teal'
    if (h<=30 or h>=345) and sat>0.25 and c[0]>c[1]+25: return 'braise'
    return None
def sweep(im,hx,hy,R,scale,label,rmax=0.72):
    px=im.load(); cov={}
    for a in range(-110,111):
        A=math.radians(a); hits={'teal':[], 'braise':[]}
        r=R*0.18
        while r<R*rmax:
            x=int(round(hx+r*math.sin(A))); y=int(round(hy-r*math.cos(A)))
            k=classe(px[x,y])
            if k: hits[k].append(r)
            r+=0.25
        cov[a]=hits
    print(f'  {label} (origine MOYEU ({hx},{hy}) ; R boitier {R/scale:.2f} CSS)')
    for k in ('teal','braise'):
        angs=[a for a in cov if len(cov[a][k])>=3]
        if not angs: print(f'     {k}: absent'); continue
        mids=sorted((min(cov[a][k])+max(cov[a][k]))/2 for a in angs)
        eps=sorted(max(cov[a][k])-min(cov[a][k]) for a in angs)
        m=mids[len(mids)//2]; e=eps[len(eps)//2]
        print(f'     {k:7s}: angles {min(angs):+4d}..{max(angs):+4d} ({len(angs)} deg couverts) ; rayon MED {m/scale:6.2f} CSS = {m/R:.4f} R ; epaisseur MED {e/scale:5.2f} CSS = {e/R:.4f} R')
    tt=[a for a in sorted(cov) if len(cov[a]['teal'])>=3]; bb=[a for a in sorted(cov) if len(cov[a]['braise'])>=3]
    if tt and bb: print(f'     SEGMENT NEUTRE entre les deux zones : {max(tt)+1:+d}..{min(bb)-1:+d} deg = {max(0,min(bb)-max(tt)-1)} deg')
    return cov
print('===== REFERENCE =====')
r=op(REF); cov=sweep(r,587.5,130.5,95.5,REF_S,'REF')
print('===== CAPTURE 2400 =====')
c=op(C24); sweep(c,539.5,114.0,110.5,CAP_S,'CAP2400')
print('===== TEMOIN famille (moyeu ~ (539.5,92)) =====')
t=op(T24); sweep(t,539.5,92.0,93.5,CAP_S,'TEMOIN')
