# m29 - le visage : bbox, rapport h/l, yeux (taille, ecartement) et bouche, rapportes a la largeur du visage.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
def peau(p):
    r,g,b=p; return 160<r<205 and 145<g<195 and 115<b<175 and r-b>25
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size}")
    # visage = plus grande composante peau
    lab={(x,y) for y in range(y0+int(0.28*Hc),y0+int(0.60*Hc)) for x in range(x0+4,x1-3) if peau(px[x,y])}
    seen=set(); best=None
    for p0 in sorted(lab):
        if p0 in seen: continue
        q=deque([p0]); seen.add(p0); pts=[]
        while q:
            x,y=q.popleft(); pts.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                n=(x+dx,y+dy)
                if n in lab and n not in seen: seen.add(n); q.append(n)
        if best is None or len(pts)>len(best): best=pts
    ax=min(p[0] for p in best);bx=max(p[0] for p in best);ay=min(p[1] for p in best);by=max(p[1] for p in best)
    W=bx-ax+1; H=by-ay+1
    print(f"  visage: CSS {W/sc:.1f}x{H/sc:.1f}  h/l={H/W:.3f}  centre%carte=({((ax+bx)/2-x0)/Wc*100:.1f},{((ay+by)/2-y0)/Hc*100:.1f})")
    # trous internes (yeux + bouche) : pixels sombres a l'interieur de la bbox du visage
    trous={(x,y) for y in range(ay,by+1) for x in range(ax,bx+1) if max(px[x,y])<90}
    seen=set(); comps=[]
    for p0 in sorted(trous):
        if p0 in seen: continue
        q=deque([p0]); seen.add(p0); pts=[]
        while q:
            x,y=q.popleft(); pts.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                n=(x+dx,y+dy)
                if n in trous and n not in seen: seen.add(n); q.append(n)
        if len(pts)>30: comps.append(pts)
    comps.sort(key=lambda p:min(q[1] for q in p))
    for pts in comps[:4]:
        cx=min(p[0] for p in pts);dx_=max(p[0] for p in pts);cy=min(p[1] for p in pts);dy_=max(p[1] for p in pts)
        if dx_-cx > 0.9*W: continue  # contour du visage
        print(f"   trou: CSS {(dx_-cx+1)/sc:.1f}x{(dy_-cy+1)/sc:.1f} = {(dx_-cx+1)/W*100:.1f}%x{(dy_-cy+1)/H*100:.1f}% du visage "
              f"| centre rel visage x={((cx+dx_)/2-ax)/W*100:.1f}% y={((cy+dy_)/2-ay)/H*100:.1f}%")
