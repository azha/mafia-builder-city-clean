# m17 - v3 : table des 18 noms. Deux durcissements par rapport a m15, chacun avec son controle :
#  (a) exclusion des SEGMENTS HORIZONTAUX de plus de 25 px  -> retire la route or (segments de
#      100 a 300 px) sans toucher aux barres de glyphes (la plus longue, la barre du T a une
#      capitale de 17 px, fait ~14 px).  CONTROLE : applique a "LE THRENNY" (peint), la mesure
#      ne doit pas bouger.
#  (b) extents ROBUSTES : largeur = p0,5..p99,5 le long de l'axe (un pixel egare gonflait ORSEL).
# CONVENTIONS : angle 0 = horizontale, POSITIF = HORAIRE ; bord = MI-ALPHA ; repere = geom.py.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics, json
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'  cap',cap.size)
MAXRUN=25
def mesure(px,W,H,box,ax,ay,ang,filtre):
    x0,y0,x1,y1=[int(v) for v in box]
    x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    Wd=x1-x0;Hd=y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    ok=[[filtre(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    allL=sorted(l for r in Ls for l in r)
    warmL=sorted(Ls[y][x] for y in range(Hd) for x in range(Wd) if ok[y][x])
    if len(warmL)<50: return None
    fond=allL[len(allL)//2]; plateau=warmL[int(len(warmL)*0.995)]
    T=(fond+plateau)/2.0
    m=[[ok[y][x] and Ls[y][x]>T for x in range(Wd)] for y in range(Hd)]
    # (a) retrait des segments horizontaux > MAXRUN
    for y in range(Hd):
        x=0
        while x<Wd:
            if m[y][x]:
                s=x
                while x<Wd and m[y][x]: x+=1
                if x-s>MAXRUN:
                    for k in range(s,x): m[y][k]=False
            else: x+=1
    a=math.radians(ang); ca,sa=math.cos(a),math.sin(a)
    pts=[(x0+x,y0+y,px[x0+x,y0+y]) for y in range(Hd) for x in range(Wd) if m[y][x]]
    if len(pts)<40: return None
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    Hb=26; best=None
    for s in range(-36,5):
        n=sum(1 for u in us if s<=u<=s+Hb)
        if best is None or n>best[0]: best=(n,s)
    s0=best[1]
    keep=[p for p,u in zip(pts,us) if s0-2<=u<=s0+Hb+2]
    if len(keep)<40: return None
    n=len(keep)
    cx=sum(p[0] for p in keep)/n; cy=sum(p[1] for p in keep)/n
    ts=sorted(ca*(p[0]-cx)+sa*(p[1]-cy) for p in keep)
    uss=sorted(-sa*(p[0]-cx)+ca*(p[1]-cy) for p in keep)
    q=lambda L_,f: L_[min(len(L_)-1,max(0,int(len(L_)*f)))]
    cap_h=q(uss,0.99)-q(uss,0.01)
    largeur=q(ts,0.995)-q(ts,0.005)
    sxx=sum((p[0]-cx)**2 for p in keep)/n; syy=sum((p[1]-cy)**2 for p in keep)/n
    sxy=sum((p[0]-cx)*(p[1]-cy) for p in keep)/n
    th=0.5*math.atan2(2*sxy,sxx-syy); ct,st=math.cos(th),math.sin(th)
    resid=math.sqrt(sum((-st*(p[0]-cx)+ct*(p[1]-cy))**2 for p in keep)/n)
    u0=q(uss,0.01); b0,b1=u0+0.35*cap_h,u0+0.62*cap_h
    rows={}
    for p in keep:
        u=-sa*(p[0]-cx)+ca*(p[1]-cy)
        if b0<=u<=b1: rows.setdefault(p[1],[]).append(p[0])
    runs=[]
    for y,xs in rows.items():
        xs=sorted(xs); s_=xs[0]; pv=xs[0]
        for x in xs[1:]:
            if x==pv+1: pv=x
            else: runs.append(pv-s_+1); s_=x; pv=x
        runs.append(pv-s_+1)
    trait=statistics.median(runs) if runs else None
    proj={}
    for p in keep:
        t=int(round(ca*(p[0]-cx)+sa*(p[1]-cy))); proj[t]=proj.get(t,0)+1
    tmin,tmax=int(q(ts,0.005)),int(q(ts,0.995)); gaps=[];run=0
    for t in range(tmin,tmax+1):
        if proj.get(t,0)==0: run+=1
        else:
            if run>=2: gaps.append(run)
            run=0
    core=[p[2] for p in keep if L(p[2])>0.90*plateau]
    col=None;ncol=0
    if len(core)>=15:
        col=(statistics.median([c[0] for c in core]),statistics.median([c[1] for c in core]),statistics.median([c[2] for c in core]))
        ncol=len(set(core))
    dens=n/(cap_h*largeur) if cap_h>0 and largeur>0 else None
    return dict(n=n,cx=cx,cy=cy,T=T,cap_h=cap_h,largeur=largeur,ang=math.degrees(th),resid=resid,
        trait=trait,gmed=(statistics.median(gaps) if gaps else None),ngaps=len(gaps),col=col,ncol=ncol,dens=dens)
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
print('\nCONTROLE de (a) sur "LE THRENNY" (peint) — doit etre inchange par le retrait des longs segments')
rx,ry=svg2ref(150,257); hw=10*12+40; box=(rx-hw,ry-36,rx+hw,ry+10)
at=mesure(R,1080,2102,box,rx,ry,0,coldf)
cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
bt=mesure(C,1080,2400,cb,acx,acy,0,coldf)
for k,d in (('REF',at),('CAP',bt)):
    print(f"  {k} n={d['n']} capH={d['cap_h']:.1f} larg={d['largeur']:.1f} ang={d['ang']:+.2f} res={d['resid']:.2f} trait={d['trait']} gap={d['gmed']} dens={d['dens']:.3f} encre={d['col']}")
rr=c2r(bt['cx'],bt['cy'])
print(f"  centre REF ({at['cx']:.1f},{at['cy']:.1f})  CAP ramene ({rr[0]:.1f},{rr[1]:.1f})  dx={rr[0]-at['cx']:+.2f} dy={rr[1]-at['cy']:+.2f}  (px de reference)")
print(f"  rapport largeur cap/ref (attendu = s = {S:.4f}) : {bt['largeur']/at['largeur']:.4f}")
res={}
print('\n=== 18 NOMS ===')
print(f"{'nom':19s} {'c':3s} {'n':>5s} {'capH':>5s} {'larg':>6s} {'av/car':>6s} {'angle':>7s} {'res':>5s} {'trait':>5s} {'gap':>5s} {'dens':>5s} {'encre':>17s}")
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys); nch=len(nom); hw=nch*12+40
    dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    a=mesure(R,1080,2102,box,rx,ry,src,warmf)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    b=mesure(C,1080,2400,cb,acx,acy,src,warmf)
    res[nom]=dict(ref=a,cap=b,src=src,anchor_ref=[rx,ry],nch=nch)
    for k,d in (('REF',a),('CAP',b)):
        if d is None: print(f'{nom:19s} {k:3s}  ---- non isolable ----'); continue
        print(f"{nom:19s} {k:3s} {d['n']:5d} {d['cap_h']:5.1f} {d['largeur']:6.1f} {d['largeur']/(nch-1):6.2f} {d['ang']:+7.2f} {d['resid']:5.2f} {str(d['trait']):>5s} {str(d['gmed']):>5s} {d['dens']:5.3f} {str(d['col']):>17s}")
json.dump(res,open('noms_v3.json','w')); print('-> noms_v3.json')
