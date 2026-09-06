# m21 - HAUTEUR DE CAPITALE et EPAISSEUR DE TRAIT, en SOUS-PIXEL.
#  hauteur de capitale : profil d'encre perpendiculaire a la ligne de base, bords a MI-HAUTEUR
#    du plateau du profil (interpolation lineaire entre bins) -> insensible au seuil de masque.
#  epaisseur de trait  : pour chaque ligne de balayage de la bande 35-62 % de la capitale, chaque
#    segment d'encre recoit une largeur SOUS-PIXEL = somme des couvertures alpha
#    alpha = clamp((L - Lfond)/(Lplateau - Lfond)) sur le segment et ses 3 voisins de chaque cote.
#    Mediane des segments. Mots SANS accent seulement (les accents faussent la capitale).
# CONTROLE POSITIF : "LE THRENNY" (peint dans la texture) -> les deux cotes doivent coincider.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'cap',cap.size)
SANS_ACCENT={'LES BASSINS','QUAI-NORD','SARNES','LA COLONNE','HAUTES-MARCHES','VERRIER',
 'SAINT-BRAND','LE TREILLIS','MARNE-BASSE','LE VERRE','ORSEL','PLACE DES COMPTES',
 'LA CHANCELLERIE','LES FRICHES','PONT-GRIS'}
def warmf(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def coldf(p): return p[2]>=p[1]>=p[0]-6 and (p[2]-p[0])>=10
def bloc(px,W,H,box,ax,ay,ang,filtre,maxrun=25):
    x0,y0,x1,y1=[int(v) for v in box]; x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    Wd,Hd=x1-x0,y1-y0
    Ls=[[L(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    ok=[[filtre(px[x0+x,y0+y]) for x in range(Wd)] for y in range(Hd)]
    allL=sorted(l for r in Ls for l in r); wl=sorted(Ls[y][x] for y in range(Hd) for x in range(Wd) if ok[y][x])
    if len(wl)<50: return None
    fond=allL[len(allL)//2]; plat=wl[int(len(wl)*0.995)]; T=(fond+plat)/2.0
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
    if len(pts)<60: return None
    r=math.radians(ang); ca,sa=math.cos(r),math.sin(r)
    us=[-sa*(p[0]-ax)+ca*(p[1]-ay) for p in pts]
    best=None
    for s in range(-40,8):
        n=sum(1 for u in us if s<=u<=s+26)
        if best is None or n>best[0]: best=(n,s)
    keep=[(p,u) for p,u in zip(pts,us) if best[1]-3<=u<=best[1]+29]
    # profil perpendiculaire, bords a mi-hauteur
    h={}
    for p,u in keep: h[int(round(u))]=h.get(int(round(u)),0)+1
    ks=sorted(h); vals=[h[k] for k in ks]
    pk=sorted(vals)[int(len(vals)*0.75)]  # plateau du profil = p75 des effectifs non nuls
    half=pk/2.0
    def bord(seq,idx,rev):
        # premiere traversee de half en partant de l'exterieur
        rng=range(len(idx)) if not rev else range(len(idx)-1,-1,-1)
        prev=None
        for i in rng:
            v=seq[i]
            if v>=half:
                if prev is None: return idx[i]
                j=idx[i]; jp=idx[prev]
                v0=seq[prev]; return jp+(half-v0)/(v-v0)*(j-jp)
            prev=i
        return None
    top=bord(vals,ks,False); bot=bord(vals,ks,True)
    caph=(bot-top) if (top is not None and bot is not None) else None
    # epaisseur de trait sous-pixel
    b0,b1=top+0.35*caph, top+0.62*caph
    rows={}
    for p,u in keep:
        if b0<=u<=b1: rows.setdefault(p[1],[]).append(p[0])
    larg=[]
    for y,xs in rows.items():
        xs=sorted(xs); s_=xs[0]; pv=xs[0]
        segs=[]
        for x in xs[1:]:
            if x==pv+1: pv=x
            else: segs.append((s_,pv)); s_=x; pv=x
        segs.append((s_,pv))
        for a_,b_ in segs:
            if b_-a_+1>maxrun: continue
            tot=0.0
            for x in range(a_-3,b_+4):
                if x<0 or x>=W: continue
                al=(L(px[x,y])-fond)/max(1e-6,(plat-fond))
                tot+=max(0.0,min(1.0,al))
            larg.append(tot)
    return dict(caph=caph, trait=(statistics.median(larg) if larg else None), nseg=len(larg),
                fond=fond, plat=plat, n=len(keep))
print('\nCONTROLE POSITIF — LE THRENNY (peint) : capitale et trait doivent coincider (x s pour la capitale)')
rx,ry=svg2ref(150,257); hw=10*12+40; box=(rx-hw,ry-36,rx+hw,ry+10)
a=bloc(R,1080,2102,box,rx,ry,0,coldf)
cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
b=bloc(C,1080,2400,cb,acx,acy,0,coldf)
print(f"   REF capitale {a['caph']:.2f} px  trait {a['trait']:.2f} px (n={a['nseg']})")
print(f"   CAP capitale {b['caph']:.2f} px  trait {b['trait']:.2f} px (n={b['nseg']})")
print(f"   rapport capitale {b['caph']/a['caph']:.4f} (attendu {S:.4f}) ; rapport trait {b['trait']/a['trait']:.4f}")
print('\n=== 15 MOTS SANS ACCENT ===')
print(f"{'quartier':19s} {'capH ref':>8s} {'capH jeu':>8s} {'rapport':>8s} {'trait ref':>9s} {'trait jeu':>9s} {'rapport':>8s}")
rc=[];rt=[]
for nom,xs,ys,src in NOMS:
    if nom not in SANS_ACCENT: continue
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40; dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    a=bloc(R,1080,2102,box,rx,ry,src,warmf)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    b=bloc(C,1080,2400,cb,acx,acy,src,warmf)
    if not a or not b or a['caph'] is None or b['caph'] is None or a['trait'] is None or b['trait'] is None:
        print(f'{nom:19s} non isolable'); continue
    rc.append(b['caph']/a['caph']); rt.append(b['trait']/a['trait'])
    print(f"{nom:19s} {a['caph']:8.2f} {b['caph']:8.2f} {b['caph']/a['caph']:8.4f} {a['trait']:9.2f} {b['trait']:9.2f} {b['trait']/a['trait']:8.4f}")
print(f"\n  hauteur de capitale jeu/maquette : mediane {statistics.median(rc):.4f} (attendu {S:.4f})")
print(f"  epaisseur de trait   jeu/maquette : mediane {statistics.median(rt):.4f} (attendu {S:.4f} si meme graisse)")
print(f"  -> a capitale egale, le trait du jeu vaut {statistics.median(rt)/statistics.median(rc):.3f} fois celui de la maquette")
