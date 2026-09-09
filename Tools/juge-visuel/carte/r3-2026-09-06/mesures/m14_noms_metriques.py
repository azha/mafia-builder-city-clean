# m14 - metriques des 18 noms, cote REFERENCE et cote CAPTURE, meme code des deux cotes.
#
# CONVENTIONS (declarees) :
#  * repere image x->droite, y->bas.  ANGLE : 0 deg = horizontale, POSITIF = HORAIRE.
#  * BORD = MI-ALPHA : pour chaque fenetre et chaque cote, seuil T = (fond + plateau)/2 ou
#    fond = mediane de L sur la fenetre, plateau = p99,5 de L parmi les pixels "chauds".
#    -> le seuil s'adapte au voile de bas de maquette et a la difference de clarte de l'encre,
#       donc les deux masques sont comparables au sens du mi-alpha.
#  * pixel "chaud" (encre des noms) : R>=G>=B et 5 <= R-B <= 90  (exclut lampes or R-B=135,
#    tours blanc-bleu R-B<0, disque "VOUS ETES ICI" or).
#  * BANDE : apres un premier masque, on ne garde que les pixels dont la coordonnee
#    PERPENDICULAIRE a la ligne de base (angle source) tombe dans la bande la plus dense de
#    hauteur (hauteur de capitale + 6) -> exclut la route or et les libelles d'ecusson.
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics, json

ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'  cap',cap.size)

def warm(p):
    d=p[0]-p[2]
    return p[0]>=p[1]>=p[2] and 5<=d<=90

def mesure(px,W,H,box,ax,ay,ang,label):
    x0,y0,x1,y1=[int(v) for v in box]
    x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    allL=[]; warmL=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; l=L(p); allL.append(l)
            if warm(p): warmL.append(l)
    if not warmL: return None
    allL.sort(); warmL.sort()
    fond=allL[len(allL)//2]
    plateau=warmL[min(len(warmL)-1,int(len(warmL)*0.995))]
    T=(fond+plateau)/2.0
    pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if warm(p) and L(p)>T: pts.append((x,y,p))
    if len(pts)<40: return None
    a=math.radians(ang); ca,sa=math.cos(a),math.sin(a)
    # coordonnee perpendiculaire (positive vers le BAS de la ligne)
    us=[(-sa*(p[0]-ax)+ca*(p[1]-ay)) for p in pts]
    lo,hi=int(min(us)),int(max(us))+1
    hist={}
    for u in us: hist[int(u)]=hist.get(int(u),0)+1
    Hb=30
    best=None
    for s in range(lo,hi):
        n=sum(hist.get(k,0) for k in range(s,s+Hb))
        if best is None or n>best[0]: best=(n,s)
    s0=best[1]
    keep=[p for p,u in zip(pts,us) if s0-2<=u<=s0+Hb+2]
    if len(keep)<40: return None
    n=len(keep)
    cx=sum(p[0] for p in keep)/n; cy=sum(p[1] for p in keep)/n
    # coordonnees le long de l'axe
    ts=[ca*(p[0]-cx)+sa*(p[1]-cy) for p in keep]
    us2=[-sa*(p[0]-cx)+ca*(p[1]-cy) for p in keep]
    us2s=sorted(us2); ts_s=sorted(ts)
    cap_h=us2s[int(n*0.99)]-us2s[int(n*0.01)]
    largeur=ts_s[-1]-ts_s[0]
    # regression de l'inclinaison : moindres carres totaux sur le nuage
    mx=sum(p[0] for p in keep)/n; my=sum(p[1] for p in keep)/n
    sxx=sum((p[0]-mx)**2 for p in keep)/n; syy=sum((p[1]-my)**2 for p in keep)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in keep)/n
    theta=0.5*math.atan2(2*sxy, sxx-syy)   # axe principal
    ang_mes=math.degrees(theta)
    # residu : ecart-type des distances a l'axe principal
    ct,st=math.cos(theta),math.sin(theta)
    resid=math.sqrt(sum((-st*(p[0]-mx)+ct*(p[1]-my))**2 for p in keep)/n)
    # epaisseur de trait : longueurs de segments horizontaux d'encre dans la bande 35-62% de la capitale
    lo2=us2s[int(n*0.01)]; hi2=us2s[int(n*0.99)]
    b0=lo2+0.35*cap_h; b1=lo2+0.62*cap_h
    rows={}
    for p,u in zip(keep,us2):
        if b0<=u<=b1: rows.setdefault(p[1],[]).append(p[0])
    runs=[]
    for y,xs in rows.items():
        xs=sorted(xs); st_=xs[0]; prev=xs[0]
        for x in xs[1:]:
            if x==prev+1: prev=x
            else: runs.append(prev-st_+1); st_=x; prev=x
        runs.append(prev-st_+1)
    runs=[r for r in runs if r>=1]
    trait=statistics.median(runs) if runs else None
    # couleur d'encre : mediane des pixels du coeur (L > T + 0.35*(plateau-T))
    Tc=T+0.35*(plateau-T)
    core=[p[2] for p in keep if L(p[2])>Tc]
    if core:
        col=(statistics.median([c[0] for c in core]),statistics.median([c[1] for c in core]),statistics.median([c[2] for c in core]))
        ncol=len(set(core))
    else: col=None; ncol=0
    return dict(n=n,cx=cx,cy=cy,T=T,fond=fond,plateau=plateau,cap_h=cap_h,largeur=largeur,
                ang=ang_mes,resid=resid,trait=trait,col=col,ncol=ncol,ncore=len(core))

res={}
print(f"{'nom':19s} {'cote':4s} {'n':>5s} {'T':>6s} {'capH':>6s} {'larg':>7s} {'angle':>7s} {'resid':>6s} {'trait':>6s} {'encre':>18s} {'#teintes':>8s}")
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys); hw=len(nom)*12+40
    dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-28-dy-8, rx+hw, ry+dy+12)
    a=mesure(R,1080,2102,box,rx,ry,src,nom+'/ref')
    cx0,cy0=r2c(box[0],box[1]); cx1,cy1=r2c(box[2],box[3]); acx,acy=r2c(rx,ry)
    b=mesure(C,1080,2400,(cx0,cy0,cx1,cy1),acx,acy,src,nom+'/cap')
    res[nom]=dict(ref=a,cap=b,src=src,anchor_ref=[rx,ry])
    for k,d in (('REF',a),('CAP',b)):
        if d is None: print(f'{nom:19s} {k:4s}  ---- non isolable ----'); continue
        print(f"{nom:19s} {k:4s} {d['n']:5d} {d['T']:6.1f} {d['cap_h']:6.1f} {d['largeur']:7.1f} {d['ang']:+7.2f} {d['resid']:6.2f} {str(d['trait']):>6s} {str(d['col']):>18s} {d['ncol']:8d}")
json.dump(res,open('noms_metriques.json','w'))
print('-> noms_metriques.json')
