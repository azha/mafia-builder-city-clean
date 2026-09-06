# m33 - EPAISSEUR DE TRAIT, convention LOCALE : pour chaque segment horizontal d'encre de la bande
# 35-62 % de la capitale, le bord est pris a MI-HAUTEUR entre la base LOCALE (mediane de L a
# 4..6 px de part et d'autre du segment) et le SOMMET du segment, par interpolation lineaire.
# Cette convention est la seule comparable ici : la base locale de la maquette est son CONTOUR
# SOMBRE, celle du jeu son HALO CLAIR (m16). Une convention a base LOINTAINE compte le halo du jeu
# comme de l'encre et gonfle son trait -- c'est ce que faisait m21 (x1,53) et c'est un artefact.
# CONTROLE POSITIF : "LE THRENNY" (peint) -> rapport attendu = s = 1,0221.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'cap',cap.size)
SANS_ACCENT={'LES BASSINS','QUAI-NORD','SARNES','LA COLONNE','HAUTES-MARCHES','SAINT-BRAND',
 'LE TREILLIS','MARNE-BASSE','LE VERRE','PLACE DES COMPTES','LES FRICHES','PONT-GRIS'}
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
def trait(px,W,H,box,ax,ay,ang,filtre,maxrun=25):
    x0,y0,x1,y1=[int(v) for v in box]; x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    Wd,Hd=x1-x0,y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    ok=[[filtre(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    allL=sorted(l for r in Ls for l in r); wl=sorted(Ls[y][x] for y in range(Hd) for x in range(Wd) if ok[y][x])
    if len(wl)<50: return None
    T=(allL[len(allL)//2]+wl[int(len(wl)*0.995)])/2.0
    m=[[ok[y][x] and Ls[y][x]>T for x in range(Wd)] for y in range(Hd)]
    for y in range(Hd):
        x=0
        while x<Wd:
            if m[y][x]:
                s=x
                while x<Wd and m[y][x]: x+=1
                if x-s>maxrun:
                    for k in range(s,x): m[y][k]=False
            else: x+=1
    r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
    pts=[(x,y) for y in range(Hd) for x in range(Wd) if m[y][x]]
    if len(pts)<60: return None
    us=[-sa*(x0+p[0]-ax)+ca*(y0+p[1]-ay) for p in pts]
    best=None
    for s in range(-40,8):
        n=sum(1 for u in us if s<=u<=s+26)
        if best is None or n>best[0]: best=(n,s)
    s0=best[1]
    keep=[(p,u) for p,u in zip(pts,us) if s0-2<=u<=s0+28]
    uss=sorted(u for _,u in keep); n=len(uss)
    utop=uss[int(n*0.01)]; caph=uss[int(n*0.99)]-utop
    b0,b1=utop+0.35*caph,utop+0.62*caph
    rows={}
    for p,u in keep:
        if b0<=u<=b1: rows.setdefault(p[1],[]).append(p[0])
    larg=[]
    for y,xs in rows.items():
        xs=sorted(xs); s_=xs[0]; pv=xs[0]; segs=[]
        for x in xs[1:]:
            if x==pv+1: pv=x
            else: segs.append((s_,pv)); s_=x; pv=x
        segs.append((s_,pv))
        for a_,b_ in segs:
            if b_-a_+1>maxrun: continue
            gx,gy=x0,y0
            gauche=[Ls[y][a_-k] for k in (4,5,6) if a_-k>=0]
            droite=[Ls[y][b_+k] for k in (4,5,6) if b_+k<Wd]
            if not gauche or not droite: continue
            base=statistics.median(gauche+droite)
            pic=max(Ls[y][x] for x in range(a_,b_+1))
            if pic-base<40: continue
            half=(base+pic)/2.0
            # bord gauche : entre a_-1 et a_
            def cross(i_out,i_in):
                v0=Ls[y][i_out]; v1=Ls[y][i_in]
                if v1==v0: return i_in
                return i_out+(half-v0)/(v1-v0)*(i_in-i_out)
            if a_-1<0 or b_+1>=Wd: continue
            xl=cross(a_-1,a_); xr=cross(b_+1,b_)
            w_=xr-xl
            if 0.5<w_<maxrun: larg.append(w_)
    return (statistics.median(larg) if larg else None), len(larg), caph
print('\nCONTROLE POSITIF — LE THRENNY (peint)')
rx,ry=svg2ref(150,257); hw=10*12+40; box=(rx-hw,ry-36,rx+hw,ry+10)
a=trait(R,1080,2102,box,rx,ry,0,coldf)
cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
b=trait(C,1080,2400,cb,acx,acy,0,coldf)
print(f'   REF trait {a[0]:.3f} px (n={a[1]}, capitale {a[2]:.1f})   CAP trait {b[0]:.3f} px (n={b[1]}, capitale {b[2]:.1f})   rapport {b[0]/a[0]:.4f} (attendu {S:.4f})')
print('\n=== 12 MOTS SANS ACCENT ===')
print(f"{'quartier':19s} {'trait maq':>10s} {'trait jeu':>10s} {'rapport':>8s} {'capH maq':>9s} {'capH jeu':>9s}")
rt=[];rc=[]
for nom,xs,ys,src in NOMS:
    if nom not in SANS_ACCENT: continue
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    a=trait(R,1080,2102,box,rx,ry,src,warmf)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    b=trait(C,1080,2400,cb,acx,acy,src,warmf)
    if not a or not b or a[0] is None or b[0] is None: print(f'{nom:19s} non isolable'); continue
    rt.append(b[0]/a[0]); rc.append(b[2]/a[2])
    print(f"{nom:19s} {a[0]:10.3f} {b[0]:10.3f} {b[0]/a[0]:8.4f} {a[2]:9.2f} {b[2]:9.2f}")
print(f"\n  trait jeu/maquette : mediane {statistics.median(rt):.4f} (attendu {S:.4f} a graisse egale)")
print(f"  capitale jeu/maquette : mediane {statistics.median(rc):.4f} (attendu {S:.4f})")
print(f"  -> a capitale egale, le trait du jeu vaut {statistics.median(rt)/statistics.median(rc):.3f} fois celui de la maquette")
