# m16 - PROFIL RADIAL de luminance autour de l'encre des noms.
# Question : la maquette CREUSE la peinture autour des lettres (paint-order:stroke, stroke #080d14,
# width 2.4 -> ~4,3 px d'anneau sombre) ; que fait le jeu ?
# Methode : masque d'encre (mi-alpha, m15), transformee de distance par chanfrein (3,4)/3,
# puis MEDIANE de L par distance d=1..14, comparee a la ligne de base LOINTAINE (d=18..26).
# Chaque image est comparee a SA PROPRE peinture lointaine (grandeur A).
# CONTROLE POSITIF : "LE THRENNY", peint DANS la texture -> le meme creux doit apparaitre des DEUX cotes.
# CONTROLE NEGATIF : encre SYNTHETIQUE (un disque pose dans le fleuve, peinture plate) -> profil plat.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics, json
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'  cap',cap.size)
INF=10**6
def dt(mask,W,H):
    d=[[0 if mask[y][x] else INF for x in range(W)] for y in range(H)]
    for y in range(H):
        for x in range(W):
            v=d[y][x]
            if y>0:
                if d[y-1][x]+3<v: v=d[y-1][x]+3
                if x>0 and d[y-1][x-1]+4<v: v=d[y-1][x-1]+4
                if x<W-1 and d[y-1][x+1]+4<v: v=d[y-1][x+1]+4
            if x>0 and d[y][x-1]+3<v: v=d[y][x-1]+3
            d[y][x]=v
    for y in range(H-1,-1,-1):
        for x in range(W-1,-1,-1):
            v=d[y][x]
            if y<H-1:
                if d[y+1][x]+3<v: v=d[y+1][x]+3
                if x>0 and d[y+1][x-1]+4<v: v=d[y+1][x-1]+4
                if x<W-1 and d[y+1][x+1]+4<v: v=d[y+1][x+1]+4
            if x<W-1 and d[y][x+1]+3<v: v=d[y][x+1]+3
            d[y][x]=v
    return d
def profil(px,W0,H0,box,filtre,seuil=None):
    x0,y0,x1,y1=[int(v) for v in box]
    x0=max(0,x0);y0=max(0,y0);x1=min(W0,x1);y1=min(H0,y1)
    W=x1-x0;H=y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(W)] for y in range(H)]
    warmL=sorted(L(px[x0+x,y0+y]) for y in range(H) for x in range(W) if filtre(px[x0+x,y0+y]))
    allL=sorted(l for row in Ls for l in row)
    if len(warmL)<50: return None
    fond=allL[len(allL)//2]; plateau=warmL[int(len(warmL)*0.995)]
    T=(fond+plateau)/2.0 if seuil is None else seuil
    mask=[[filtre(px[x0+x,y0+y]) and Ls[y][x]>T for x in range(W)] for y in range(H)]
    nink=sum(sum(1 for v in r if v) for r in mask)
    if nink<60: return None
    d=dt(mask,W,H)
    buckets={}
    for y in range(H):
        for x in range(W):
            dd=d[y][x]/3.0
            if dd<=0.01: continue
            k=int(round(dd))
            if 1<=k<=26: buckets.setdefault(k,[]).append(Ls[y][x])
    base=[]
    for k in range(18,27): base+=buckets.get(k,[])
    if len(base)<80: return None
    b=statistics.median(base)
    prof={k:(statistics.median(v)-b, len(v)) for k,v in sorted(buckets.items()) if k<=14}
    return dict(T=T,nink=nink,base=b,prof=prof)
def warmf(p):
    dd=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=dd<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
CIBLES=['SARNES','DEPOT-EST','LE VERRE','MARNE-BASSE','SAINT-BRAND','LE TREILLIS','QUAI-NORD','PLACE DES COMPTES']
print('\n=== (A) chaque image contre SA propre peinture lointaine (d=18..26) ===')
print(f"{'nom':18s} {'cote':4s} " + ' '.join('%5s'%('d%d'%k) for k in range(1,13)))
out={}
for nom,xs,ys,src in NOMS:
    if nom not in CIBLES: continue
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+46
    dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-34-dy, rx+hw, ry+dy+18)
    a=profil(R,1080,2102,box,warmf)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3]))
    b=profil(C,1080,2400,cb,warmf)
    out[nom]={'ref':a,'cap':b}
    for k,d_ in (('REF',a),('CAP',b)):
        if d_ is None: print(f'{nom:18s} {k:4s} n/a'); continue
        print(f"{nom:18s} {k:4s} "+' '.join('%+5.1f'%d_['prof'][j][0] if j in d_['prof'] else '   . ' for j in range(1,13))+f"   base={d_['base']:.1f} nink={d_['nink']}")
print('\n=== CONTROLE POSITIF : LE THRENNY (peint DANS la texture) ===')
rx,ry=svg2ref(150,257); hw=10*12+46
box=(rx-hw,ry-40,rx+hw,ry+18)
a=profil(R,1080,2102,box,coldf); cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); b=profil(C,1080,2400,cb,coldf)
for k,d_ in (('REF',a),('CAP',b)):
    print(f"  {k} "+' '.join('%+5.1f'%d_['prof'][j][0] for j in range(1,13))+f"  base={d_['base']:.1f} nink={d_['nink']}")
print('\n=== CONTROLE NEGATIF : encre synthetique dans le fleuve (peinture plate) ===')
from PIL import ImageDraw
for nomi,src_img in (('ref',ref),('cap',cap)):
    im=src_img.copy(); dr=ImageDraw.Draw(im)
    yy=1100 if nomi=='ref' else 1130
    for i in range(8): dr.rectangle([380+i*22,yy,380+i*22+7,yy+17],fill=(204,196,174))
    p=profil(im.load(),im.size[0],im.size[1],(340,yy-30,600,yy+45),warmf)
    print(f"  {nomi} "+' '.join('%+5.1f'%p['prof'][j][0] for j in range(1,13))+f"  base={p['base']:.1f} nink={p['nink']}")
json.dump({k:{kk:(vv if vv is None else {'base':vv['base'],'prof':{str(a):b[0] for a,b in vv['prof'].items()}}) for kk,vv in v.items()} for k,v in out.items()},open('halo.json','w'))
print('-> halo.json')
