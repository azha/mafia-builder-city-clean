# Y a-t-il d'autres "pastilles" (petits jetons a anneau dore, ~10 px) que les 3 au-dessus de G2 ?
# Gabarit annulaire de rayon 4.0-5.0 sur la meme couleur d'anneau. Controles positif (les 3 connues)
# et negatif (les 11 badges : rayon 6.5, doivent etre REJETES par ce gabarit).
from PIL import Image
import math
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
ring=[[0]*W for _ in range(H)]
for y in range(H):
    for x in range(W):
        r,g,b=px[x,y]
        if abs(r-176)<=30 and abs(g-141)<=30 and abs(b-62)<=30: ring[y][x]=1
ann=[(dx,dy) for dy in range(-6,7) for dx in range(-6,7) if 4.0<=math.hypot(dx,dy)<=5.2]
print(f'gabarit pastille : {len(ann)} offsets, rayon 4.0-5.2')
def sc(cx,cy): return sum(1 for dx,dy in ann if 0<=cx+dx<W and 0<=cy+dy<H and ring[cy+dy][cx+dx])/len(ann)
print('[controle POSITIF] les 3 pastilles reperees au-dessus de G2 :')
for p in [(527,530),(540,530),(553,530)]: print(f'   {p} score={sc(*p):.2f}')
print('[controle NEGATIF] les centres des 11 badges (anneau de rayon 6.5) :')
for p in [(347,552),(539,552),(731,552),(155,744),(923,744),(155,936),(155,1320)]:
    print(f'   {p} score={sc(*p):.2f}')
hits=[]
for cy in range(6,H-6):
    for cx in range(6,W-6):
        if not ring[cy][cx-5] and not ring[cy][cx+5]: continue
        s=sc(cx,cy)
        if s>=0.60: hits.append((s,cx,cy))
groups=[]
for s,cx,cy in sorted(hits,reverse=True):
    for g in groups:
        if abs(g[1]-cx)<=5 and abs(g[2]-cy)<=5: break
    else: groups.append((s,cx,cy))
print(f'\nbalayage seuil 0.60 : {len(hits)} px, {len(groups)} groupes')
for s,cx,cy in sorted(groups,key=lambda t:(t[2],t[1])): print(f'   ({cx},{cy}) score={s:.2f}')
