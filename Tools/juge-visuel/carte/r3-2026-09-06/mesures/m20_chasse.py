# m20 - CHASSE / INTERLETTRAGE. On ne mesure plus une largeur d'extremites (sensible aux pixels
# egares) mais les CENTRES DE LETTRE : projection de l'encre sur l'axe de la ligne de base,
# decoupage en amas separes par >=2 colonnes vides, centre de chaque amas, puis MEDIANE des
# ecarts entre amas consecutifs = AVANCE PAR CARACTERE. Les ecarts > 40 px (espace de mot ou
# amas parasite) sont ecartes du calcul de la mediane et comptes a part.
# CONTROLE POSITIF : "LE THRENNY" (peint) -> l'avance du jeu doit valoir celle de la maquette x s.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'cap',cap.size)
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
def masque(px,W,H,box,filtre,maxrun=25):
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
    return [(x0+x,y0+y) for y in range(Hd) for x in range(Wd) if m[y][x]]
def bande(pts,ax,ay,ang,Hb=26):
    r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    best=None
    for s in range(-40,8):
        n=sum(1 for u in us if s<=u<=s+Hb)
        if best is None or n>best[0]: best=(n,s)
    return [p for p,u in zip(pts,us) if best[1]-3<=u<=best[1]+Hb+3]
def amas(pts,ax,ay,ang):
    r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
    prj={}
    for p in pts:
        t=int(round(ca*(p[0]-ax)+sa*(p[1]-ay))); prj[t]=prj.get(t,0)+1
    ks=sorted(prj); groups=[]; cur=[ks[0]]
    for k in ks[1:]:
        if k-cur[-1]<=2: cur.append(k)
        else: groups.append(cur); cur=[k]
    groups.append(cur)
    # centre pondere de chaque amas, amas de moins de 12 px d'encre ecartes
    cent=[]
    for g in groups:
        w=sum(prj[k] for k in g)
        if w<12: continue
        cent.append((sum(prj[k]*k for k in g)/w, w, g[0], g[-1]))
    return cent,prj
def avance(cent):
    d=[cent[i+1][0]-cent[i][0] for i in range(len(cent)-1)]
    petits=[v for v in d if v<=40]
    grands=[v for v in d if v>40]
    return (statistics.median(petits) if petits else None), len(petits), grands
def gaps(cent):
    return [cent[i+1][2]-cent[i][3]-1 for i in range(len(cent)-1)]
def bloc(nom,xs,ys,src,filtre=warmf):
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    pr=masque(R,1080,2102,box,filtre); cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    pc=masque(C,1080,2400,cb,filtre)
    if not pr or not pc: return None
    pr=bande(pr,rx,ry,src); pc=bande(pc,acx,acy,src)
    cr,_=amas(pr,rx,ry,src); cc,_=amas(pc,acx,acy,src)
    return cr,cc
print('\nCONTROLE POSITIF — LE THRENNY (peint) ; rapport attendu = s = %.4f'%S)
cr,cc=bloc('LE THRENNY',150,257,0,coldf)
ar,nr,gr=avance(cr); ac,nc,gc=avance(cc)
print(f'   REF amas={len(cr)} avance={ar:.2f} px (n={nr}) grands={["%.0f"%v for v in gr]}')
print(f'   CAP amas={len(cc)} avance={ac:.2f} px (n={nc}) grands={["%.0f"%v for v in gc]}')
print(f'   rapport jeu/maquette = {ac/ar:.4f}  (attendu {S:.4f})')
print('\n=== AVANCE PAR CARACTERE et ECARTS INTER-LETTRES ===')
print(f"{'quartier':19s} {'car':>3s} {'amas ref':>8s} {'amas jeu':>8s} {'avance ref':>10s} {'avance jeu':>10s} {'jeu/ref':>8s} {'gap ref':>7s} {'gap jeu':>7s}")
rat=[];gr_all=[];gc_all=[]
for nom,xs,ys,src in NOMS:
    b=bloc(nom,xs,ys,src)
    if b is None: print(f'{nom:19s} non isolable'); continue
    cr,cc=b
    if len(cr)<3 or len(cc)<3: print(f'{nom:19s} amas insuffisants ({len(cr)}/{len(cc)})'); continue
    ar,nr,_=avance(cr); ac,nc,_=avance(cc)
    if ar is None or ac is None: continue
    gg_r=[v for v in gaps(cr) if 0<v<=25]; gg_c=[v for v in gaps(cc) if 0<v<=25]
    mr=statistics.median(gg_r) if gg_r else float('nan'); mc=statistics.median(gg_c) if gg_c else float('nan')
    gr_all+=gg_r; gc_all+=gg_c
    rat.append(ac/ar)
    print(f"{nom:19s} {len(nom):3d} {len(cr):8d} {len(cc):8d} {ar:10.2f} {ac:10.2f} {ac/ar:8.4f} {mr:7.1f} {mc:7.1f}")
print(f"\n  avance jeu/maquette : mediane {statistics.median(rat):.4f} (attendu {S:.4f} si l'interlettrage est identique)")
print(f"  ecart inter-lettres : maquette mediane {statistics.median(gr_all):.1f} px (n={len(gr_all)}) ; jeu mediane {statistics.median(gc_all):.1f} px (n={len(gc_all)})")
print(f"  interlettrage declare : 0,24 em x 6,6 px x 3,6 = {0.24*6.6*3.6:.2f} px de reference")
