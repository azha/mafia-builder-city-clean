# Detecteur d'anneaux de badge : masque sur la couleur d'anneau (176,141,62) a tolerance L-inf,
# fermeture par dilatation de rayon R, composantes connexes 8-voisins.
# Imprime chaque composante : nb px, bbox, centre, largeur/hauteur.
from PIL import Image
import sys
SRC='../capture-nuit-1080x1920.png'
TOL = int(sys.argv[1]) if len(sys.argv)>1 else 30
R   = int(sys.argv[2]) if len(sys.argv)>2 else 2
im = Image.open(SRC); W,H = im.size
print(f'ouvre {SRC} : taille={im.size} mode={im.mode} | TOL={TOL} dilatation={R}')
px = im.load()
TR,TG,TB = 176,141,62
mask = bytearray(W*H)
n=0
for y in range(H):
    row=y*W
    for x in range(W):
        r,g,b = px[x,y]
        if abs(r-TR)<=TOL and abs(g-TG)<=TOL and abs(b-TB)<=TOL:
            mask[row+x]=1; n+=1
print('px masque =', n)
# dilatation
dil = bytearray(mask)
for y in range(H):
    for x in range(W):
        if mask[y*W+x]:
            for dy in range(-R,R+1):
                yy=y+dy
                if yy<0 or yy>=H: continue
                for dx in range(-R,R+1):
                    xx=x+dx
                    if 0<=xx<W: dil[yy*W+xx]=1
# composantes connexes sur dil, mais on compte les px du masque original
seen = bytearray(W*H)
comps=[]
for y0 in range(H):
    for x0 in range(W):
        i0=y0*W+x0
        if dil[i0] and not seen[i0]:
            stack=[i0]; seen[i0]=1
            cells=[]
            while stack:
                i=stack.pop(); cells.append(i)
                y,x = divmod(i,W)
                for dy in(-1,0,1):
                    yy=y+dy
                    if yy<0 or yy>=H: continue
                    for dx in(-1,0,1):
                        xx=x+dx
                        if xx<0 or xx>=W: continue
                        j=yy*W+xx
                        if dil[j] and not seen[j]:
                            seen[j]=1; stack.append(j)
            xs=[c%W for c in cells]; ys=[c//W for c in cells]
            core=sum(1 for c in cells if mask[c])
            comps.append((core,min(xs)+R,min(ys)+R,max(xs)-R,max(ys)-R))
comps.sort(key=lambda t:-t[0])
print(f'composantes = {len(comps)}')
print('  core  bbox(x0,y0,x1,y1)          w  h   centre')
for core,x0,y0,x1,y1 in comps:
    if core<8: continue
    w=x1-x0+1; h=y1-y0+1
    print(f'  {core:5d}  ({x0:4d},{y0:4d},{x1:4d},{y1:4d})  {w:4d} {h:3d}   ({(x0+x1)/2:7.1f},{(y0+y1)/2:7.1f})')
print('composantes core<8 :', sum(1 for c in comps if c[0]<8))
