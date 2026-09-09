# -- m15 : FOND du cadran. (a) amplitude INTER-SECTEURS (composante directionnelle) ; (b) profil RADIAL.
#    Pixels d'arc, d'aiguille et de texte exclus par un filtre de saturation/luminance.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
RH= {'ref':31.16,'c19':32.50,'c24':32.50}   # rayon median du cerclage

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def ok(p):   # fond bleu nuit : B > R, pas de crème, pas de teal sature, pas de braise
    return p[2] > p[0]+4 and p[0]<120 and (p[1]+p[2])/2 - p[0] < 26 and lum(p)<90

def secteurs(key, f0=0.58, f1=0.72, nsec=8):
    s=sc(key); im=img(key); cx,cy=C[key]; R=RH[key]
    res=[]
    for k in range(nsec):
        a0=k*360.0/nsec; vals=[]; rej=0
        a=a0
        while a<a0+360.0/nsec:
            r=R*f0
            while r<=R*f1:
                p=bil(im,s,cx+r*math.cos(math.radians(a)),cy-r*math.sin(math.radians(a)))
                if ok(p): vals.append(p)
                else: rej+=1
                r+=0.15
            a+=0.5
        if not vals: res.append((a0,None,0,rej)); continue
        med=tuple(sorted(v[c] for v in vals)[len(vals)//2] for c in range(3))
        res.append((a0,med,len(vals),rej))
    return res

def radial(key, f0=0.35, f1=0.90):
    s=sc(key); im=img(key); cx,cy=C[key]; R=RH[key]
    out=[]; f=f0
    while f<=f1:
        vals=[]
        for i in range(360):
            p=bil(im,s,cx+R*f*math.cos(math.radians(i)),cy-R*f*math.sin(math.radians(i)))
            if ok(p): vals.append(lum(p))
        vals.sort()
        out.append((f, vals[len(vals)//2] if vals else None, len(vals))); f+=0.05
    return out

for key in ['ref','c19','c24']:
    print("=== %s ==="%key)
    r=secteurs(key)
    for a0,med,n,rej in r:
        print("   secteur %3d..%3d deg : mediane %-16s (n=%4d retenus, %4d rejetes)  L=%s"
              %(a0,a0+45,str(med),n,rej, ("%.1f"%lum(med)) if med else "-"))
    ms=[m for _,m,_,_ in r if m]
    amp=tuple(max(m[c] for m in ms)-min(m[c] for m in ms) for c in range(3))
    Ls=[lum(m) for m in ms]
    print("   ⇒ AMPLITUDE INTER-SECTEURS  RGB %s   L %.1f   (secteur le plus clair : %d deg)"
          %(str(amp), max(Ls)-min(Ls), r[Ls.index(max(Ls))][0]))
    rr=radial(key)
    vals=[v for _,v,_ in rr if v]
    print("   profil RADIAL L(f=r/Rcerclage) :", " ".join("%.2f:%.0f"%(f,v) for f,v,_ in rr if v))
    print("   ⇒ AMPLITUDE RADIALE L = %.1f"%(max(vals)-min(vals)))
