# ORACLE INDEPENDANT du detecteur d'anneau : le POINT interieur du badge, couleur exacte (255,183,38).
# Aucun rapport avec le gabarit annulaire -> si les deux comptes coincident, la population est etablie.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
TARGETS={'point (255,183,38)':(255,183,38)}
for nom,(TR,TG,TB) in TARGETS.items():
    pts=[(x,y) for y in range(H) for x in range(W) if px[x,y]==(TR,TG,TB)]
    print(f'{nom} : {len(pts)} px exacts')
    seen=set(); comps=[]
    S=set(pts)
    for p in pts:
        if p in seen: continue
        stack=[p]; seen.add(p); cell=[]
        while stack:
            x,y=stack.pop(); cell.append((x,y))
            for dx in(-1,0,1):
                for dy in(-1,0,1):
                    q=(x+dx,y+dy)
                    if q in S and q not in seen: seen.add(q); stack.append(q)
        xs=[c[0] for c in cell]; ys=[c[1] for c in cell]
        comps.append((len(cell),(min(xs)+max(xs))/2,(min(ys)+max(ys))/2,min(xs),min(ys),max(xs),max(ys)))
    comps.sort(key=lambda t:(t[2],t[1]))
    print(f'  amas = {len(comps)}')
    for k,(n,cx,cy,x0,y0,x1,y1) in enumerate(comps,1):
        print(f'   P{k:2d} n={n:3d} centre=({cx:7.1f},{cy:7.1f}) bbox=({x0},{y0},{x1},{y1})')
