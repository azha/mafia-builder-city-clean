# m15 - v2 des metriques des noms. Correctif du m14 : la bande perpendiculaire est CONTRAINTE
# autour de la ligne de base attendue (sinon la route or, plus dense que le texte, capture la
# bande sur LA COLONNE / HAUTES-MARCHES, et le disque or sur LA LISIERE).
#   bande : sommet s0 dans [-36, +4] px de la ligne de base de l'ancre, hauteur 26.
# CONVENTIONS : voir geom.py (angle 0 = horizontale, positif = HORAIRE ; bord = MI-ALPHA).
# Controle POSITIF de l'instrument : "LE THRENNY", peint DANS la texture, mesure des deux cotes.
# Controle NEGATIF : une fenetre de fleuve nu (sans encre) doit rendre "non isolable".
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
import math, statistics, json
ref=Image.open('../reference-1080x2102.png').convert('RGB'); R=ref.load()
cap=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB'); C=cap.load()
print('ref',ref.size,'  cap',cap.size)
def warm(p):
    d=p[0]-p[2]; return p[0]>=p[1]>=p[2] and 5<=d<=75
def mesure(px,W,H,box,ax,ay,ang,nch):
    x0,y0,x1,y1=[int(v) for v in box]
    x0=max(0,x0);y0=max(0,y0);x1=min(W,x1);y1=min(H,y1)
    allL=[];warmL=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y];l=L(p);allL.append(l)
            if warm(p): warmL.append(l)
    if len(warmL)<50: return None
    allL.sort();warmL.sort()
    fond=allL[len(allL)//2]; plateau=warmL[int(len(warmL)*0.995)]
    T=(fond+plateau)/2.0
    a=math.radians(ang);ca,sa=math.cos(a),math.sin(a)
    pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if warm(p) and L(p)>T:
                u=-sa*(x-ax)+ca*(y-ay); pts.append((x,y,p,u))
    if len(pts)<40: return None
    Hb=26
    best=None
    for s in range(-36,5):
        n=sum(1 for p in pts if s<=p[3]<=s+Hb)
        if best is None or n>best[0]: best=(n,s)
    s0=best[1]
    keep=[p for p in pts if s0-2<=p[3]<=s0+Hb+2]
    if len(keep)<40: return None
    n=len(keep)
    cx=sum(p[0] for p in keep)/n; cy=sum(p[1] for p in keep)/n
    ts=sorted(ca*(p[0]-cx)+sa*(p[1]-cy) for p in keep)
    us=sorted(-sa*(p[0]-cx)+ca*(p[1]-cy) for p in keep)
    cap_h=us[int(n*0.99)]-us[int(n*0.01)]
    largeur=ts[-1]-ts[0]
    mx,my=cx,cy
    sxx=sum((p[0]-mx)**2 for p in keep)/n; syy=sum((p[1]-my)**2 for p in keep)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in keep)/n
    th=0.5*math.atan2(2*sxy,sxx-syy); ang_mes=math.degrees(th)
    ct,st=math.cos(th),math.sin(th)
    resid=math.sqrt(sum((-st*(p[0]-mx)+ct*(p[1]-my))**2 for p in keep)/n)
    # epaisseur de trait : segments horizontaux dans la bande 35-62% de la capitale
    u0=us[int(n*0.01)]
    b0,b1=u0+0.35*cap_h,u0+0.62*cap_h
    rows={}
    for p in keep:
        u=-sa*(p[0]-cx)+ca*(p[1]-cy)
        if b0<=u<=b1: rows.setdefault(p[1],[]).append(p[0])
    runs=[]
    for y,xs in rows.items():
        xs=sorted(xs);s_=xs[0];pv=xs[0]
        for x in xs[1:]:
            if x==pv+1: pv=x
            else: runs.append(pv-s_+1);s_=x;pv=x
        runs.append(pv-s_+1)
    trait=statistics.median(runs) if runs else None
    # ecarts inter-lettres : projection sur l'axe, colonnes vides de largeur >=2
    proj={}
    for p in keep:
        t=int(round(ca*(p[0]-cx)+sa*(p[1]-cy))); proj[t]=proj.get(t,0)+1
    tmin,tmax=int(ts[0]),int(ts[-1])
    gaps=[];run=0
    for t in range(tmin,tmax+1):
        if proj.get(t,0)==0: run+=1
        else:
            if run>=2: gaps.append(run)
            run=0
    # couleur du coeur
    core=[p[2] for p in keep if L(p[2])>0.90*plateau]
    col=None;ncol=0
    if len(core)>=15:
        col=(statistics.median([c[0] for c in core]),statistics.median([c[1] for c in core]),statistics.median([c[2] for c in core]))
        ncol=len(set(core))
    return dict(n=n,cx=cx,cy=cy,T=T,fond=fond,plateau=plateau,cap_h=cap_h,largeur=largeur,
        ang=ang_mes,resid=resid,trait=trait,gaps=gaps,gmed=(statistics.median(gaps) if gaps else None),
        ngaps=len(gaps),col=col,ncol=ncol,s0=s0,ncore=len(core))
res={}
hdr=f"{'nom':19s} {'c':3s} {'n':>5s} {'T':>6s} {'capH':>5s} {'larg':>6s} {'av/car':>6s} {'angle':>7s} {'res':>5s} {'trait':>5s} {'gap':>5s} {'#g':>3s} {'encre':>17s} {'#t':>4s}"
print(hdr)
for nom,xs,ys,src in NOMS:
    rx,ry=svg2ref(xs,ys); nch=len(nom); hw=nch*12+40
    dy=abs(math.sin(math.radians(src)))*hw
    box=(rx-hw, ry-30-dy-6, rx+hw, ry+dy+10)
    a=mesure(R,1080,2102,box,rx,ry,src,nch)
    cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
    b=mesure(C,1080,2400,cb,acx,acy,src,nch)
    res[nom]=dict(ref=a,cap=b,src=src,anchor_ref=[rx,ry],nch=nch)
    for k,d in (('REF',a),('CAP',b)):
        if d is None: print(f'{nom:19s} {k:3s}   ---- non isolable ----'); continue
        av=d['largeur']/(nch-1)
        print(f"{nom:19s} {k:3s} {d['n']:5d} {d['T']:6.1f} {d['cap_h']:5.1f} {d['largeur']:6.1f} {av:6.2f} {d['ang']:+7.2f} {d['resid']:5.2f} {str(d['trait']):>5s} {str(d['gmed']):>5s} {d['ngaps']:3d} {str(d['col']):>17s} {d['ncol']:4d}")
json.dump(res,open('noms_metriques.json','w'))
print('-> noms_metriques.json')
# --- controles de l'instrument ---
print('\nCONTROLE POSITIF  "LE THRENNY" (peint dans la texture, present des DEUX cotes)')
# LE THRENNY : ancre svg (150,257) ; encre bleu clair -> filtre chaud inadapte : on mesure avec
# un filtre FROID dedie, meme geometrie.
def warmc(p): return True
import types
def mesure_froid(px,W,H,box,ax,ay,ang,nch):
    global warm
    old=warm
    warm=lambda p:(p[2]>=p[1]>=p[0]-6) and (p[2]-p[0])>=10
    try: return mesure(px,W,H,box,ax,ay,ang,nch)
    finally: warm=old
rx,ry=svg2ref(150,257); hw=10*12+40
box=(rx-hw,ry-36,rx+hw,ry+10)
at=mesure_froid(R,1080,2102,box,rx,ry,0,10)
cb=(*r2c(box[0],box[1]),*r2c(box[2],box[3])); acx,acy=r2c(rx,ry)
bt=mesure_froid(C,1080,2400,cb,acx,acy,0,10)
for k,d in (('REF',at),('CAP',bt)):
    if d is None: print('  ',k,'non isolable'); continue
    print(f"   {k} n={d['n']} capH={d['cap_h']:.1f} larg={d['largeur']:.1f} angle={d['ang']:+.2f} trait={d['trait']} gapmed={d['gmed']} encre={d['col']}")
if at and bt:
    print(f"   -> capH {at['cap_h']:.1f} vs {bt['cap_h']:.1f} ({100*(bt['cap_h']/at['cap_h']-1):+.1f}%) ; largeur {at['largeur']:.1f} vs {bt['largeur']:.1f} ({100*(bt['largeur']/at['largeur']-1):+.1f}%)")
    print(f"   -> centre d'encre REF ({at['cx']:.1f},{at['cy']:.1f})  CAP ramene ref ({c2r(bt['cx'],bt['cy'])[0]:.1f},{c2r(bt['cx'],bt['cy'])[1]:.1f})")
print('\nCONTROLE NEGATIF  fenetre de fleuve nu (aucune encre attendue)')
print('   ', mesure(R,1080,2102,(300,1020,520,1080),410,1060,0,6))
