# m19 - INCLINAISON des 18 noms. CONVENTION : 0 deg = horizontale ; POSITIF = HORAIRE a l'ecran
# (meme sens que rotate(+n) du SVG source). Estimateur : angle qui rend le profil d'encre
# PERPENDICULAIRE le plus CONCENTRE (somme des carres des effectifs, pas a 0,05 deg) -- c'est la
# ligne de base du texte, pas l'axe principal du nuage (celui-ci derive sur les mots courts).
# RESIDU imprime : ecart-type des distances a la ligne de base retenue (px).
# CONTROLE POSITIF : "LE THRENNY", peint, doit rendre le meme angle des deux cotes (~0).
# CONTROLE NEGATIF : le meme mot mesure sur une image tournee de +3 deg doit rendre +3 deg.
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
def ang_net(pts,ax,ay,a0):
    best=None
    for i in range(-100,101):
        a=a0+i*0.05; r=math.radians(a); ca,sa=math.cos(r),math.sin(r)
        h={}
        for p in pts:
            u=int(round(-sa*(p[0]-ax)+ca*(p[1]-ay))); h[u]=h.get(u,0)+1
        s=sum(v*v for v in h.values())
        if best is None or s>best[0]: best=(s,a)
    a=best[1]; r=math.radians(a); ca,sa=math.cos(r),math.sin(r)
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    m=statistics.median(us)
    return a, statistics.pstdev(us)
def prep(nom,xs,ys,src,filtre=warmf):
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    pr=masque(R,1080,2102,box,filtre)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    pc=masque(C,1080,2400,cb,filtre)
    if not pr or not pc: return None
    def bande(pts,ax,ay,ang,Hb=26):
        r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
        us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
        best=None
        for s in range(-40,8):
            n=sum(1 for u in us if s<=u<=s+Hb)
            if best is None or n>best[0]: best=(n,s)
        return [p for p,u in zip(pts,us) if best[1]-3<=u<=best[1]+Hb+3]
    return bande(pr,rx,ry,src),bande(pc,acx,acy,src),(rx,ry),(acx,acy)
print('\nCONTROLE POSITIF — LE THRENNY (peint)')
q=prep('LE THRENNY',150,257,0,coldf)
a1,r1=ang_net(q[0],*q[2],0); a2,r2_=ang_net(q[1],*q[3],0)
print(f'   REF {a1:+.2f} deg (residu {r1:.2f} px)   CAP {a2:+.2f} deg (residu {r2_:.2f} px)   ecart {a2-a1:+.2f}')
print('\nCONTROLE NEGATIF — la meme fenetre de reference tournee de +3,00 deg doit rendre +3,00')
from PIL import Image as I2
rot=ref.rotate(-3.0, resample=I2.BICUBIC, center=(541.7,1137.1))  # rotate() est TRIGO -> -3 = +3 horaire
Rr=rot.load()
pr2=masque(Rr,1080,2102,(541.7-160,1137.1-36,541.7+160,1137.1+10),coldf)
a3,r3=ang_net(pr2,541.7,1137.1,3.0)
print(f'   mesure {a3:+.2f} deg (attendu +3,00 ; residu {r3:.2f} px)')
print('\n=== INCLINAISON DES 18 NOMS (deg, positif = horaire) ===')
print(f"{'quartier':19s} {'source':>7s} {'maquette':>9s} {'res':>5s} {'jeu':>8s} {'res':>5s} {'jeu-source':>11s} {'jeu-maq':>8s}")
ds=[];dm=[]
for nom,xs,ys,src in NOMS:
    q=prep(nom,xs,ys,src)
    if q is None: print(f'{nom:19s} non isolable'); continue
    a1,r1=ang_net(q[0],*q[2],src); a2,r2_=ang_net(q[1],*q[3],src)
    ds.append(a2-src); dm.append(a2-a1)
    print(f"{nom:19s} {src:+7d} {a1:+9.2f} {r1:5.2f} {a2:+8.2f} {r2_:5.2f} {a2-src:+11.2f} {a2-a1:+8.2f}")
print(f"\n  jeu - source : mediane {statistics.median(ds):+.2f} deg, max |{max(abs(v) for v in ds):.2f}| deg")
print(f"  jeu - maquette : mediane {statistics.median(dm):+.2f} deg, max |{max(abs(v) for v in dm):.2f}| deg")
