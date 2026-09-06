# -- m12 : epaisseur RADIALE de l'arc a angles fixes (bord = mi-hauteur entre fond local et pic du rayon).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))
teal = lambda p: (p[1]+p[2])/2 - p[0]
brz  = lambda p: p[0]-(p[1]+p[2])/2

def ray(key,a,metric,r0=6.0,r1=24.0):
    s=sc(key); im=img(key); cx,cy=C[key]; th=math.radians(a)
    pr=[]; r=r0
    while r<=r1:
        pr.append((r,metric(bil(im,s,cx+r*math.cos(th),cy-r*math.sin(th))))); r+=0.02
    pk=max(pr,key=lambda t:t[1]); base=min(v for _,v in pr)
    half=(pk[1]+base)/2
    i=pr.index(pk); a_=i
    while a_>0 and pr[a_-1][1]>=half: a_-=1
    b_=i
    while b_<len(pr)-1 and pr[b_+1][1]>=half: b_+=1
    return pr[a_][0], pr[b_][0], pr[b_][0]-pr[a_][0], pk[1], pk[0]

print("=== epaisseur radiale (bord = mi-hauteur) — TEAL ===")
for key in ['ref','c19','c24']:
    ang = [100,120,140,160] if key=='ref' else [100,120,140,160]
    out=[]
    for a in ang:
        i,o,w,pk,rp=ray(key,a,teal); out.append("%d°: r %.2f..%.2f ⇒ %.2f (pic %.0f)"%(a,i,o,w,pk))
    print("  %-4s "%key+" | ".join(out))
print("=== epaisseur radiale — BRAISE ===")
for key in ['ref','c19','c24']:
    ang=[10,20,30,40]
    out=[]
    for a in ang:
        i,o,w,pk,rp=ray(key,a,brz); out.append("%d°: r %.2f..%.2f ⇒ %.2f (pic %.0f)"%(a,i,o,w,pk))
    print("  %-4s "%key+" | ".join(out))
