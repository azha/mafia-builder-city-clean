# -- m11 : carte ANGULAIRE des arcs. 0 deg = droite, sens trigo (90 = haut).
#    Sonde = max de la metrique sur la bande radiale de l'arc, par pas de 1 deg.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
BAND={'ref':(11.0,17.0),'c19':(12.0,19.0),'c24':(12.0,19.0)}

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

teal = lambda p: (p[1]+p[2])/2 - p[0]
brz  = lambda p: p[0]-(p[1]+p[2])/2

def carte(key):
    s=sc(key); im=img(key); cx,cy=C[key]; r0,r1=BAND[key]
    out={}
    for a in range(0,360):
        th=math.radians(a); bt=-99; bb=-99
        r=r0
        while r<=r1:
            p=bil(im,s,cx+r*math.cos(th),cy-r*math.sin(th))
            bt=max(bt,teal(p)); bb=max(bb,brz(p)); r+=0.1
        out[a]=(bt,bb)
    return out

def secteurs(c, seuil_t, seuil_b):
    T=[a for a in range(360) if c[a][0]>=seuil_t]
    B=[a for a in range(360) if c[a][1]>=seuil_b]
    def runs(S):
        S=sorted(S); out=[]
        for a in S:
            if out and a==out[-1][1]+1: out[-1][1]=a
            else: out.append([a,a])
        if len(out)>1 and out[0][0]==0 and out[-1][1]==359:
            out[0][0]=out[-1][0]-360; out.pop()
        return out
    return runs(T),runs(B)

for key in ['ref','c19','c24']:
    c=carte(key)
    print("=== %s ==="%key)
    print("  bande radiale %s ; seuils : teal>=18, braise>=25"%(str(BAND[key])))
    T,B=secteurs(c,18,25)
    print("  TEAL   secteurs :", ["%d..%d (%d deg)"%(a,b,b-a+1) for a,b in T])
    print("  BRAISE secteurs :", ["%d..%d (%d deg)"%(a,b,b-a+1) for a,b in B])
    # segment neutre entre la fin du teal (max) et le debut de la braise (min>fin teal)
    if T and B:
        tmax=max(b for a,b in T); bmin=min(a for a,b in B if a>0) if any(a>0 for a,b in B) else min(a for a,b in B)
        bmax=max(b for a,b in B)
        print("  fin TEAL=%d deg ; debut BRAISE(le plus proche du haut)=%d deg"%(tmax, max(a for a,b in B if a<tmax) if any(a<tmax for a,b in B) else bmax))
    print("  profil 1 deg (40..110) teal/braise :")
    print("   ", " ".join("%d:%d/%d"%(a,c[a][0],c[a][1]) for a in range(40,111,2)))
