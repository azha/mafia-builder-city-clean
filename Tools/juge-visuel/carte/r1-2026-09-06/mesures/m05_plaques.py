# m05 : inventaire des PLAQUES de la capture (les 18 marqueurs de nom).
# Une plaque = aplat gris clair uniforme (r~g, b legerement > r) tres au-dessus du fond.
# Detection : pixels dans la fenetre de couleur, composantes connexes >= 1500 px.
# Controle positif : le nombre de composantes doit valoir 18 (18 quartiers) -- imprime.
from PIL import Image
from collections import deque

im=Image.open('capture-1080x2400.png').convert('RGB'); print(f"ouvert capture-1080x2400.png -> {im.size}")
w,h=im.size; px=im.load()
print("echantillon couleur au centre d'une plaque (100,497) =", px[100,497], " (300,497) =", px[300,497])

def plaque(p):
    r,g,b=p
    return 110<r<175 and 110<g<175 and 120<b<190 and abs(r-g)<10 and 0<=b-r<26

seen=[[False]*h for _ in range(w)]
comps=[]
for y in range(230,2160):
    for x in range(w):
        if seen[x][y] or not plaque(px[x,y]): continue
        q=deque([(x,y)]); seen[x][y]=True; pts=[]
        while q:
            a,b_=q.popleft(); pts.append((a,b_))
            for da,db in ((1,0),(-1,0),(0,1),(0,-1)):
                na,nb=a+da,b_+db
                if 0<=na<w and 230<=nb<2160 and not seen[na][nb] and plaque(px[na,nb]):
                    seen[na][nb]=True; q.append((na,nb))
        if len(pts)>=1200: comps.append(pts)
print(f"composantes >=1200 px : {len(comps)}")
comps.sort(key=lambda c: (min(p[1] for p in c), min(p[0] for p in c)))
print(f"{'#':>3} {'x0':>5} {'y0':>5} {'x1':>5} {'y1':>5} {'larg':>5} {'haut':>5} {'n':>6}  couleur mediane")
import statistics
for i,c in enumerate(comps,1):
    xs=[p[0] for p in c]; ys=[p[1] for p in c]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    cx,cy=(x0+x1)//2,(y0+y1)//2
    # mediane sur une fenetre 5x5 dans un coin de la plaque (evite le texte)
    win=[px[x,y] for y in range(y0+4,y0+9) for x in range(x0+4,x0+9)]
    med=tuple(int(statistics.median([q[k] for q in win])) for k in range(3))
    print(f"{i:>3} {x0:>5} {y0:>5} {x1:>5} {y1:>5} {x1-x0+1:>5} {y1-y0+1:>5} {len(c):>6}  {med}")
