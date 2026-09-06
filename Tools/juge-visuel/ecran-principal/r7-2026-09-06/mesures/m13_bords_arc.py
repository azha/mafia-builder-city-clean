# -- m13 : bords INTERIEUR/EXTERIEUR de chaque arc en fonction de l'angle (l'arc est-il un ANNEAU ?)
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820)}
def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))
teal = lambda p: (p[1]+p[2])/2 - p[0]
brz  = lambda p: p[0]-(p[1]+p[2])/2
def edges(key,a,metric,r0=8.0,r1=22.0):
    s=sc(key); im=img(key); cx,cy=C[key]; th=math.radians(a)
    pr=[]; r=r0
    while r<=r1:
        pr.append((r,metric(bil(im,s,cx+r*math.cos(th),cy-r*math.sin(th))))); r+=0.02
    pk=max(pr,key=lambda t:t[1]); base=min(v for _,v in pr); half=(pk[1]+base)/2
    i=pr.index(pk); a_=i
    while a_>0 and pr[a_-1][1]>=half: a_-=1
    b_=i
    while b_<len(pr)-1 and pr[b_+1][1]>=half: b_+=1
    return pr[a_][0],pr[b_][0],pk[1]

for key in ['ref','c19']:
    print("=== %s — BRAISE : bord int / bord ext / epaisseur ==="%key)
    for a in range(5,71,5):
        i,o,pk=edges(key,a,brz)
        print("   %3d deg : int %.2f  ext %.2f  ep %.2f  (pic %.0f)"%(a,i,o,o-i,pk))
    print("=== %s — TEAL ==="%key)
    for a in range(85,201,10):
        i,o,pk=edges(key,a,teal)
        print("   %3d deg : int %.2f  ext %.2f  ep %.2f  (pic %.0f)"%(a,i,o,o-i,pk))
