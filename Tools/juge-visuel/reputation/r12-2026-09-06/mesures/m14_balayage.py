import sys; sys.path.insert(0,'.')
from lib import *
print("=== m14 : ligne de balayage teal — etendue, epaisseur, position, force ===")
def score(c):  # teal = G+B eleves, R bas
    r,g,b=c; return (g+b)/2 - r
CAS=[('REF','../reference-1080x2102.png',452,1626, 850,1611, 1075,1098),
     ('JEU','../capture-1080x2400.png',  482,1627, 876,1655, 1090,1112)]
for nom,f,ct,h,ey0,ey1,y0,y1 in CAS:
    im=ouvrir(f); p=px(im)
    # ligne de pic : y ou le score moyen sur x 100..1000 est max
    best=None
    for y in range(y0,y1):
        s=sum(score(p[x,y]) for x in range(100,1000))/900
        if best is None or s>best[1]: best=(y,s)
    yb=best[0]
    print(f"  {nom} ligne de pic y={yb} (rel {yb-ct}, {100*(yb-ct)/h:.2f} % du cadre ; {100*(yb-ey0)/(ey1-ey0+1):.1f} % du panneau elast)")
    # etendue : colonnes ou le score depasse le fond de 4
    fond = sorted(score(p[x,yb]) for x in range(0,1080))[100]
    xs=[x for x in range(0,1080) if score(p[x,yb])-fond > 4]
    print(f"     fond de score = {fond:.1f} ; etendue x {min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px")
    # epaisseur au centre
    xm=(min(xs)+max(xs))//2
    col=[y for y in range(yb-14,yb+14) if score(p[xm,y])-fond>4]
    print(f"     epaisseur au centre (x={xm}) = {len(col)} px  (y {min(col)}..{max(col)})")
    # profil : score au pic et aux extremites
    prof=[(x, round(score(p[x,yb])-fond,1)) for x in range(min(xs), max(xs)+1, max(1,(max(xs)-min(xs))//12))]
    print(f"     profil (x, score-fond) : {prof}")
