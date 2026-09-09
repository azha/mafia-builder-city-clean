# m35 - restes : (a) marges des noms au bord du cadre, (b) ecarts autour du TRAIT D'UNION,
# (c) couleur des libelles du dock hors souligne, (d) volute du bandeau.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
print('cap',cap.size,'ref',ref.size)
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def amasx(px,W,H,box,ax,ay,ang,maxrun=25):
    x0,y0,x1,y1=[int(v) for v in box]; x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    Wd,Hd=x1-x0,y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    ok=[[warmf(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
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
    pts=[(x0+x,y0+y) for y in range(Hd) for x in range(Wd) if m[y][x]]
    r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    best=None
    for s in range(-40,8):
        n=sum(1 for u in us if s<=u<=s+26)
        if best is None or n>best[0]: best=(n,s)
    keep=[p for p,u in zip(pts,us) if best[1]-2<=u<=best[1]+28]
    prj={}
    for p in keep:
        t=int(round(ca*(p[0]-ax)+sa*(p[1]-ay))); prj[t]=prj.get(t,0)+1
    ks=sorted(prj); grp=[];cur=[ks[0]]
    for k in ks[1:]:
        if k-cur[-1]<=2: cur.append(k)
        else: grp.append(cur); cur=[k]
    grp.append(cur)
    out=[]
    for g in grp:
        wgt=sum(prj[k] for k in g)
        if wgt<12: continue
        out.append((g[0],g[-1],wgt))
    xs=[p[0] for p in keep]
    return out,min(xs),max(xs)
print('\n(a) MARGES : bbox horizontale de l encre de chaque nom dans la capture')
mg=[]
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    r=amasx(C,1080,2400,cb,acx,acy,src)
    if not r: print(f'{nom:19s} n/a'); continue
    seg,x0,x1=r
    mg.append((nom,x0,1079-x1))
    print(f'{nom:19s} encre x {x0:4d}..{x1:4d}  marge gauche {x0:4d} px  marge droite {1079-x1:4d} px  ({len(seg)} amas)')
print('  -> marge minimale a gauche %d px, a droite %d px (aucun nom coupe si > 0)'%(min(m[1] for m in mg),min(m[2] for m in mg)))
print('\n(b) TRAIT D UNION : ecarts entre amas consecutifs, mots a trait d union')
for nom in ('PONT-GRIS','DEPOT-EST','SAINT-BRAND','QUAI-NORD','MARNE-BASSE'):
    for n2,xs,ys,src in NOMS:
        if n2!=nom: continue
        rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
        box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
        sr=amasx(R,1080,2102,box,rx,ry,src)
        cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
        sc=amasx(C,1080,2400,cb,acx,acy,src)
        for lab,s_ in (('maquette',sr),('jeu     ',sc)):
            if not s_: print(f'  {nom} {lab} n/a'); continue
            seg=s_[0]
            gaps=[seg[i+1][0]-seg[i][1]-1 for i in range(len(seg)-1)]
            larg=[b-a+1 for a,b,w in seg]
            print(f'  {nom:12s} {lab}: {len(seg)} amas ; largeurs {larg} ; ecarts {gaps}')
