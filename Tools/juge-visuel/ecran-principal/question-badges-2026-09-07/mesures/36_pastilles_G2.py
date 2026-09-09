# Geometrie des 3 pastilles au-dessus de G2 : amas de couleur d anneau dans la bande.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
pts=[(x,y) for y in range(518,542) for x in range(510,570)
     if abs(px[x,y][0]-176)<=30 and abs(px[x,y][1]-141)<=30 and abs(px[x,y][2]-62)<=30]
print(f'{len(pts)} px de couleur d anneau dans (510..569, 518..541)')
S=set(pts); seen=set(); comps=[]
for p in pts:
    if p in seen: continue
    st=[p]; seen.add(p); cell=[]
    while st:
        x,y=st.pop(); cell.append((x,y))
        for dx in(-1,0,1):
            for dy in(-1,0,1):
                q=(x+dx,y+dy)
                if q in S and q not in seen: seen.add(q); st.append(q)
    xs=[c[0] for c in cell]; ys=[c[1] for c in cell]
    comps.append((len(cell),min(xs),min(ys),max(xs),max(ys)))
comps.sort(key=lambda t:t[1])
for i,(n,x0,y0,x1,y1) in enumerate(comps,1):
    print(f'  pastille {i} : {n} px  bbox=({x0},{y0},{x1},{y1})  diametre={x1-x0+1}x{y1-y0+1}  centre=({(x0+x1)/2},{(y0+y1)/2})')
