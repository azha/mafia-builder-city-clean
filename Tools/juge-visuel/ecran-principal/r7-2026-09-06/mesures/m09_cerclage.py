# -- m09 : NETTETE du cerclage. Grandeur = (R-B), discriminante entre laiton/braise (>+100) et tout le reste (<0).
#    Convention de bord DECLAREE : NOMINAL = largeur a mi-hauteur (mi-alpha) au-dessus de la ligne de base radiale ;
#    COEUR = largeur ou le signal depasse 95 % du pic.  Controle positif : le canon doit rendre coeur ~= 1,0 CSS.
import sys, math; sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

C = {'ref':(195.840,38.837),'c19':(195.817,39.820),'c24':(195.819,39.817),'d24':(195.819,39.817)}
FY= {'ref':(50.4,52.4),'c19':(50.6,52.2),'c24':(50.6,52.2),'d24':(50.6,52.2)}

def bil(im,s,xc,yc):
    x=xc*s; y=yc*s; x0=int(math.floor(x)); y0=int(math.floor(y)); fx=x-x0; fy=y-y0
    d=im.load(); W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return d[a,b]
    p00=g(x0,y0);p10=g(x0+1,y0);p01=g(x0,y0+1);p11=g(x0+1,y0+1)
    return tuple((p00[c]*(1-fx)*(1-fy)+p10[c]*fx*(1-fy)+p01[c]*(1-fx)*fy+p11[c]*fx*fy) for c in range(3))

def prof(key, r0=24.0, r1=40.0, st=0.02, n=288):
    s=sc(key); im=img(key); cx,cy=C[key]; fy=FY[key]
    out=[]; r=r0
    while r<=r1+1e-9:
        v=[]
        for i in range(n):
            th=2*math.pi*i/n
            x=cx+r*math.cos(th); y=cy-r*math.sin(th)
            if fy[0]<=y<=fy[1]: continue
            p=bil(im,s,x,y); v.append(p[0]-p[2])
        v.sort(); out.append((r,v[len(v)//2])); r+=st
    return out

def analyse(key,p):
    base=min(v for r,v in p if r<28 or r>38)
    pk=max(p,key=lambda t:t[1]); half=base+(pk[1]-base)/2; q95=base+0.95*(pk[1]-base)
    i=p.index(pk)
    def w(thr):
        a=i
        while a>0 and p[a-1][1]>=thr: a-=1
        b=i
        while b<len(p)-1 and p[b+1][1]>=thr: b+=1
        return p[a][0],p[b][0],p[b][0]-p[a][0]
    ha,hb,hw=w(half); ca,cb,cw=w(q95)
    print("  %s : pic (R−B)=%.1f a r=%.2f ; base=%.1f"%(key,pk[1],pk[0],base))
    print("     NOMINAL (mi-hauteur) %.2f..%.2f ⇒ %.2f CSS   |   COEUR (95%%) %.2f..%.2f ⇒ %.2f CSS"%(ha,hb,hw,ca,cb,cw))
    print("     ⇒ diametre NOMINAL exterieur %.2f CSS ; ligne mediane du trait %.2f CSS"%(2*hb,2*pk[0]))
    return dict(pk=pk[1],rpk=pk[0],nom=hw,coeur=cw,ext=2*hb,med=2*pk[0])

res={}
print("=== CONTROLE POSITIF : canon (cerclage laiton, trait net attendu ~1,0 CSS de coeur) ===")
p=prof('ref'); res['ref']=analyse('ref',p)
print("     echantillon (R−B) tous les 0,2 CSS :", " ".join("%.1f:%d"%(r,v) for r,v in p if abs(r*5-round(r*5))<1e-6 and 28<=r<=36))
print()
for k in ['c19','c24']:
    p=prof(k); res[k]=analyse(k,p)
    print("     echantillon (R−B) :", " ".join("%.1f:%d"%(r,v) for r,v in p if abs(r*5-round(r*5))<1e-6 and 28<=r<=36))
print()
print("=== SYNTHESE ===")
for k in ['c19','c24']:
    print("  %s : coeur %.2f vs canon %.2f (x%.2f) ; nominal %.2f vs %.2f (x%.2f) ; diam ext %.2f vs %.2f (%+.1f %%)"
      %(k,res[k]['coeur'],res['ref']['coeur'],res[k]['coeur']/res['ref']['coeur'],
        res[k]['nom'],res['ref']['nom'],res[k]['nom']/res['ref']['nom'],
        res[k]['ext'],res['ref']['ext'],100*(res[k]['ext']/res['ref']['ext']-1)))
