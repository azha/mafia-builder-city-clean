# m18 - TABLE DES 18 NOMS (annexe demandee) : centre d'ENCRE canon en CSS, centre d'encre du jeu
# RAMENE dans le repere du canon (via le recalage m06), puis dx / dy.
# DEUX CHEMINS pour dy et dx, calcules independamment :
#   (1) CENTROIDE du masque d'encre (mi-alpha, filtre chaud, retrait des segments > 25 px) ;
#   (2) CORRELATION des profils d'encre 1-D (perpendiculaire pour dy, axial pour dx), profils
#       normalises a somme 1 -> insensible a la difference de MASSE d'encre entre les deux cotes.
# Ils doivent concorder ; l'ecart entre les deux est imprime (colonne |1-2|).
# CONTROLE POSITIF : "LE THRENNY" (peint dans la texture) doit rendre dy ~ 0 par les deux chemins.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics, json
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'  cap',cap.size)
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
def masque(px,W,H,box,filtre,maxrun=25):
    x0,y0,x1,y1=[int(v) for v in box]
    x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    Wd=x1-x0;Hd=y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    ok=[[filtre(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    allL=sorted(l for r in Ls for l in r); warmL=sorted(Ls[y][x] for y in range(Hd) for x in range(Wd) if ok[y][x])
    if len(warmL)<50: return None,None
    T=(allL[len(allL)//2]+warmL[int(len(warmL)*0.995)])/2.0
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
    return [(x0+x,y0+y) for y in range(Hd) for x in range(Wd) if m[y][x]], T
def bande(pts,ax,ay,ang,Hb=26):
    a=math.radians(ang); ca,sa=math.cos(a),math.sin(a)
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    best=None
    for s in range(-40,8):
        n=sum(1 for u in us if s<=u<=s+Hb)
        if best is None or n>best[0]: best=(n,s)
    s0=best[1]
    return [p for p,u in zip(pts,us) if s0-3<=u<=s0+Hb+3]
def profils(pts,ax,ay,ang):
    a=math.radians(ang); ca,sa=math.cos(a),math.sin(a)
    pu={}; pt={}
    for p in pts:
        u=-sa*(p[0]-ax)+ca*(p[1]-ay); t=ca*(p[0]-ax)+sa*(p[1]-ay)
        pu[int(round(u))]=pu.get(int(round(u)),0)+1
        pt[int(round(t))]=pt.get(int(round(t)),0)+1
    return pu,pt
def decale(pa,pb,lo=-25,hi=25):
    # normalise puis maximise le recouvrement sum min(a, b decale)
    sa=sum(pa.values()); sb=sum(pb.values())
    A={k:v/sa for k,v in pa.items()}; B={k:v/sb for k,v in pb.items()}
    best=None
    for d10 in range(lo*4,hi*4+1):
        d=d10/4.0
        s=0.0
        for k,v in A.items():
            k2=k+d; f=math.floor(k2); fr=k2-f
            w=B.get(f,0)*(1-fr)+B.get(f+1,0)*fr
            s+=min(v,w)
        if best is None or s>best[0]: best=(s,d)
    return best[1],best[0]
def bloc(nom,xs,ys,src,filtre=warmf):
    rx,ry=svg2ref(xs,ys); nch=len(nom); hw=nch*12+40
    dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    pr,_=masque(R,1080,2102,box,filtre)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    pc,_=masque(C,1080,2400,cb,filtre)
    if pr is None or pc is None: return None
    pr=bande(pr,rx,ry,src); pc=bande(pc,acx,acy,src)
    if len(pr)<40 or len(pc)<40: return None
    # centroides
    crx=sum(p[0] for p in pr)/len(pr); cry=sum(p[1] for p in pr)/len(pr)
    ccx=sum(p[0] for p in pc)/len(pc); ccy=sum(p[1] for p in pc)/len(pc)
    ccx_r,ccy_r=c2r(ccx,ccy)
    # profils : cote capture RAMENE dans le repere reference avant de profiler
    pc_r=[c2r(p[0],p[1]) for p in pc]
    ur,tr=profils(pr,rx,ry,src); uc,tc=profils(pc_r,rx,ry,src)
    du,_=decale(ur,uc); dt_,_=decale(tr,tc)
    return dict(nom=nom,nch=nch,ancre_ref=(rx,ry),
                cref=(crx,cry),ccap_ref=(ccx_r,ccy_r),
                dx_c=ccx_r-crx, dy_c=ccy_r-cry, dx_p=dt_, dy_p=du,
                nref=len(pr),ncap=len(pc))
print('\nCONTROLE POSITIF — LE THRENNY (peint DANS la texture) : dy attendu ~ 0 par les deux chemins')
b=bloc('LE THRENNY',150,257,0,coldf)
print(f"   centroide dx={b['dx_c']:+.2f} dy={b['dy_c']:+.2f}   profils dx={b['dx_p']:+.2f} dy={b['dy_p']:+.2f}  (px de reference)")
print('\n=== TABLE DES 18 NOMS (px de la reference, puis CSS = px/3,6) ===')
print(f"{'quartier':19s} | {'centre CANON (CSS)':>19s} | {'centre JEU->CANON (CSS)':>23s} | {'dx px':>6s} {'dy px':>6s} | {'dx CSS':>7s} {'dy CSS':>7s} | {'dy prof':>7s} {'|c-p|':>6s}")
rows=[]
for nom,xs,ys,src in NOMS:
    b=bloc(nom,xs,ys,src)
    if b is None: print(f'{nom:19s} | ---- non isolable ----'); continue
    rows.append(b)
    print(f"{nom:19s} | ({b['cref'][0]/3.6:7.2f},{b['cref'][1]/3.6:7.2f}) | ({b['ccap_ref'][0]/3.6:9.2f},{b['ccap_ref'][1]/3.6:9.2f}) | {b['dx_c']:+6.2f} {b['dy_c']:+6.2f} | {b['dx_c']/3.6:+7.2f} {b['dy_c']/3.6:+7.2f} | {b['dy_p']:+7.2f} {abs(b['dy_c']-b['dy_p']):6.2f}")
dyc=[r['dy_c'] for r in rows]; dxc=[r['dx_c'] for r in rows]; dyp=[r['dy_p'] for r in rows]
print(f"\n  n={len(rows)}   dy centroide : mediane {statistics.median(dyc):+.2f} px  (etendue {min(dyc):+.2f} .. {max(dyc):+.2f})  ; meme signe : {sum(1 for v in dyc if v>0)}/{len(dyc)}")
print(f"             dy profils   : mediane {statistics.median(dyp):+.2f} px  (etendue {min(dyp):+.2f} .. {max(dyp):+.2f})  ; meme signe : {sum(1 for v in dyp if v>0)}/{len(dyp)}")
print(f"             dx centroide : mediane {statistics.median(dxc):+.2f} px  (etendue {min(dxc):+.2f} .. {max(dxc):+.2f})")
print(f"  en CSS : dy mediane {statistics.median(dyc)/3.6:+.2f} CSS ; en % d'une hauteur de capitale (17 px) : {100*statistics.median(dyc)/17:.0f} %")
json.dump([{k:(list(v) if isinstance(v,tuple) else v) for k,v in r.items()} for r in rows],open('table18.json','w'))
print('-> table18.json')
