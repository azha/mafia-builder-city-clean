# m18 — aiguille : longueur et angle depuis le pivot. On isole le trait (creme) au-dessus du pivot
# en excluant les glyphes (composante connexe touchant le pivot).
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m18 aiguille ===')
def creme(c):
    r,g,b=c; return r>150 and g>145 and b>125 and abs(r-g)<25 and 0<=r-b<=60
CFG=[(CANON,'canon',SC_CANON,587.49,116.52,93.94,587.45,130.85),
     (DIST,'district2400',SC_CAPT,539.50,109.67,89.56,539.21,123.60)]
for path,nom,sc,mcx,mcy,mR,pvx,pvy in CFG:
    im=ouvrir(path,nom); px=im.load()
    lim=0.80*mR
    S=set()
    for y in range(int(mcy-lim),int(mcy+lim)):
        for x in range(int(mcx-lim),int(mcx+lim)):
            if math.hypot(x-mcx,y-mcy)<lim and creme(px[x,y]): S.add((x,y))
    # graine : les pixels creme les plus proches du pivot
    graines=[p for p in S if math.hypot(p[0]-pvx,p[1]-pvy)<=4.0*sc/2.755*1.5]
    if not graines:
        graines=sorted(S,key=lambda p:math.hypot(p[0]-pvx,p[1]-pvy))[:5]
    vus=set(graines); pile=list(graines)
    while pile:
        q=pile.pop()
        for d in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
            n=(q[0]+d[0],q[1]+d[1])
            if n in S and n not in vus: vus.add(n); pile.append(n)
    comp=list(vus)
    ds=[(math.hypot(p[0]-pvx,p[1]-pvy),p) for p in comp]
    ds.sort()
    loin=ds[-1]
    # angle : moyenne des angles des 12 % les plus loin
    q=[p for d,p in ds[int(len(ds)*0.88):]]
    ang=med([math.degrees(math.atan2(-(p[1]-pvy),p[0]-pvx)) for p in q])
    print('   [%s] composante de l\'aiguille : %d px ; longueur max %.2f CSS ; angle (0=+x, sens trigo) %.1f deg ; angle depuis la VERTICALE %+.1f deg'
          % (nom,len(comp),loin[0]/sc,ang,90-ang))
