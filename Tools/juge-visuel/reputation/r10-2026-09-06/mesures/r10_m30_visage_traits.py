# r10-m30 : yeux et bouche (encre SUR la peau) — controle positif du dessin du visage.
#  SVG : yeux ellipses rx=1,9 ry=2,3 a x=26,5 et 35,5 ; bouche path quadratique, sw=1,7.
# Controle positif : les deux yeux d'une meme image doivent avoir la meme taille a +-1 px.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(210,650,336,764),5.486,272.3),
    "CAP":(D+"capture-1080x2400.png",18,18,(186,644,324,760),5.472,254.6)}
def enc(p): return p[0]<60 and p[1]<60 and p[2]<70
for k,(p,x0,y0,(u0,v0,u1,v1),ech,cu) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    S={(u,v) for v in range(v0,v1) for u in range(u0,u1) if enc(px[x0+u,y0+v])}
    comps=[];seen=set()
    for s in S:
        if s in seen: continue
        q=deque([s]);seen.add(s);c=[]
        while q:
            u,v=q.popleft(); c.append((u,v))
            for du,dv in ((1,0),(-1,0),(0,1),(0,-1)):
                n=(u+du,v+dv)
                if n in S and n not in seen: seen.add(n); q.append(n)
        comps.append(c)
    comps=[c for c in comps if len(c)>60]
    comps.sort(key=lambda c:min(u for u,_ in c))
    print(f"\n=== {k} taille={im.size}  echelle {ech} px/u  axe u={cu}")
    for c in comps:
        us=[a for a,_ in c]; vs=[b for _,b in c]
        print(f"   trait : {max(us)-min(us)+1} x {max(vs)-min(vs)+1} px "
              f"({(max(us)-min(us)+1)/ech:.2f} x {(max(vs)-min(vs)+1)/ech:.2f} u)  aire={len(c)}  "
              f"centre x_svg={31+((min(us)+max(us))/2-cu)/ech:.2f}  v {min(vs)}..{max(vs)}")
