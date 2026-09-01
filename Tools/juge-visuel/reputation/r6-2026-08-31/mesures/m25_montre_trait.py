# m25 - la montre (disque clair sur le buste) et le trait horizontal sous le col.
# Controle : on cherche le MEME objet dans les deux images, avec le meme critere.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
CASES=[("ref",D+"reference/m-120.png",69,732,422,1279,3.0),
       ("cap",S+"screen_b3_reputation_1080x1920.png",72,435,496,1061,3.6)]
for k,f,x0,y0,x1,y1,sc in CASES:
    im=Image.open(f).convert("RGB"); px=im.load(); Wc=x1-x0;Hc=y1-y0
    print(f"== {k} size={im.size}")
    # zone du buste : 55%..88% de la carte
    ya,yb=y0+int(0.55*Hc), y0+int(0.90*Hc)
    lab={(x,y) for y in range(ya,yb) for x in range(x0+4,x1-3)
         if 45<max(px[x,y])<200 and abs(px[x,y][2]-px[x,y][0])<25}
    seen=set()
    for p0 in sorted(lab):
        if p0 in seen: continue
        q=deque([p0]); seen.add(p0); pts=[]
        while q:
            x,y=q.popleft(); pts.append((x,y))
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(-1,-1),(1,-1),(-1,1)):
                n=(x+dx,y+dy)
                if n in lab and n not in seen: seen.add(n); q.append(n)
        if len(pts)<80: continue
        ax=min(p[0] for p in pts);bx=max(p[0] for p in pts);ay=min(p[1] for p in pts);by=max(p[1] for p in pts)
        cols=sorted((sum(px[x,y]),px[x,y]) for x,y in pts); C=cols[len(cols)//2][1]
        print(f"   comp aire={len(pts):5d} CSS {(bx-ax+1)/sc:5.1f}x{(by-ay+1)/sc:5.1f} "
              f"centre%carte=({((ax+bx)/2-x0)/Wc*100:5.1f},{((ay+by)/2-y0)/Hc*100:5.1f}) "
              f"aire/bbox={len(pts)/((bx-ax+1)*(by-ay+1)):.2f} RGB median={C}")
