# -- m56 : les DEUX arcs du canon sont-ils concentriques avec le boitier ? on cherche le centre qui egalise
#    les rayons mesures a des angles MIROIRS (40 vs 140, 30 vs 150, 20 vs 160).
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))
sat = lambda p: max(p)-min(p)
def rayon(key,cx,cy,a,metric):
    s=sc(key); im=img(key); th=math.radians(a); pr=[]; r=8.0
    while r<=22.0:
        pr.append((r,metric(bil(im,s,cx+r*math.cos(th),cy-r*math.sin(th))))); r+=0.02
    pk=max(pr,key=lambda t:t[1]); base=min(v for _,v in pr); half=(pk[1]+base)/2
    i=pr.index(pk); a_=i
    while a_>0 and pr[a_-1][1]>=half: a_-=1
    b_=i
    while b_<len(pr)-1 and pr[b_+1][1]>=half: b_+=1
    return (pr[a_][0]+pr[b_][0])/2
teal = lambda p: (p[1]+p[2])/2 - p[0]
brz  = lambda p: p[0]-(p[1]+p[2])/2
for key,cy in [('ref',38.837),('c19',39.820)]:
    print("=== %s ==="%key)
    for dcx in [0.0,0.4,0.8,1.2,1.6]:
        cx=(195.840 if key=='ref' else 195.817)+dcx
        d=[]
        for a in [20,30,40]:
            rb=rayon(key,cx,cy,a,brz); rt=rayon(key,cx,cy,180-a,teal); d.append(rb-rt)
        print("   cx=%+.1f : ecart rayon(braise a) - rayon(teal a 180-a) pour a=20,30,40 : %s  (moyenne %+.3f)"
              %(dcx," · ".join("%+.2f"%v for v in d), sum(d)/3))
