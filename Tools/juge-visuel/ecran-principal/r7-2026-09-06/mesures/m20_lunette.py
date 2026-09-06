# -- m20 : LUNETTE (bosse claire a l'interieur du boitier). Profil radial fin 0,70..0,99 R, pixels de texte exclus.
#    Controle positif : le canon DOIT montrer une bosse ; controle negatif : le fond plat (0,60..0,70) n'en montre pas.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *
C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817)}
RH= {'ref':31.16,'c19':32.50,'c24':32.50}
def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))
ok = lambda p: p[2]>p[0] and p[0]<130 and lum(p)<120
for key in ['ref','c19','c24']:
    s=sc(key); im=img(key); cx,cy=C[key]; R=RH[key]
    print("=== %s (R cerclage = %.2f CSS) ==="%(key,R))
    out=[]; f=0.60
    while f<=0.99:
        v=[]
        for i in range(720):
            a=i*0.5
            p=bil(im,s,cx+R*f*math.cos(math.radians(a)),cy-R*f*math.sin(math.radians(a)))
            if ok(p): v.append(lum(p))
        v.sort(); out.append((f, v[len(v)//2] if v else None, len(v))); f+=0.01
    print("   L(f) :", " ".join("%.2f:%.1f"%(f,v) for f,v,_ in out if v))
    vals=[(f,v) for f,v,_ in out if v]
    # bosse = maximum local hors extremites
    inner=[v for f,v in vals if f<=0.80]
    if inner:
        base=sum(inner)/len(inner)
        pk=max([(f,v) for f,v in vals if 0.80<f<0.97], key=lambda t:t[1])
        print("   base (f<=0,80) = %.1f ; max local sur 0,80..0,97 = %.1f a f=%.2f (r=%.2f CSS) ⇒ bosse = %+.1f L"
              %(base,pk[1],pk[0],pk[0]*R,pk[1]-base))
