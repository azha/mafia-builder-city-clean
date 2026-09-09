# m04 — profil radial du cerclage : plateau (bord net) vs halo etale. Centres de m03.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m04 profil radial du cerclage (R-B median sur 720 rayons) ===')

CFG = [
 (CANON,'canon',       SC_CANON, 587.49, 116.52, 'laiton'),
 (DIST, 'district2400',SC_CAPT,  539.50, 109.67, 'braise'),
 (F1920,'fiche1920',   SC_CAPT,  539.50, 109.67, 'braise'),
]

for path,nom,sc,cx,cy,tk in CFG:
    im=ouvrir(path,nom); px=im.load(); W,H=im.size
    N=720
    prof=[]
    r=0.0
    while r <= 30.0*sc/3.0 + 60:   # jusqu'a ~ +20 CSS au-dela du bord
        r+=0.0
        break
    rs=[i*0.25 for i in range(0,int(24.0*sc/1.0*0+1)) ]
    rs=[i*0.25 for i in range(int(45*sc/ (sc/1.0) )) ]  # placeholder
    rs=[i*0.25 for i in range(int(45*sc/0.25/ (sc) *1))]
    rs=[i*0.25*1 for i in range(0, int(45.0*sc/0.25/sc)+1)]
    # simple: de 0 a 45 CSS par pas de 0,05 CSS
    rs=[k*0.05 for k in range(0, 901)]
    out={}
    for rc in rs:
        rr = rc*sc
        vals=[]
        for k in range(N):
            a=2*math.pi*k/N
            xi=int(round(cx+rr*math.cos(a))); yi=int(round(cy+rr*math.sin(a)))
            if 0<=xi<W and 0<=yi<H:
                c=px[xi,yi]; vals.append(c[0]-c[2])
        out[round(rc,2)]=med(vals)
    pic=max(out.items(), key=lambda kv: kv[1])
    print('   [%s] pic (R-B)=%.1f a r=%.2f CSS' % (nom,pic[1],pic[0]))
    top=pic[1]
    ks=sorted(out)
    def cross(f, sens):
        seq=[k for k in ks if (k<=pic[0] if sens<0 else k>=pic[0])]
        if sens<0: seq=seq[::-1]
        prev=pic[0]
        for k in seq:
            if out[k] < top*f: return k
            prev=k
        return None
    for f in (0.9,0.5,0.1,0.02):
        a=cross(f,-1); b=cross(f,+1)
        print('      a %3d%% du pic : r %s..%s CSS   epaisseur %s   D_ext %s'
              % (int(f*100), '%.2f'%a if a else '--','%.2f'%b if b else '--',
                 '%.2f'%(b-a) if a and b else '--','%.2f'%(2*b) if b else '--'))
    # portee du halo : dernier r ou l'exces > 0,5 au-dela du pic
    base = med([out[k] for k in ks if k>40.0])
    dernier=None
    for k in ks:
        if k>pic[0] and out[k]-base>0.5: dernier=k
    print('      fond hors medaillon (R-B) = %.1f ; portee de l\'exces >0,5 : jusqu\'a r=%.2f CSS (soit %.2f CSS au-dela du pic)'
          % (base, dernier if dernier else -1, (dernier-pic[0]) if dernier else -1))
    ech=[k for k in ks if abs(k-pic[0])<=6 and abs((k*4)%1)<1e-9]
    print('      profil :', ', '.join('%.2f:%.0f'%(k,out[k]) for k in ech))
    print()
