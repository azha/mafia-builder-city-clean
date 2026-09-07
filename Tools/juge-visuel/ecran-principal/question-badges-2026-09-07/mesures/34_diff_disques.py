# Ou G5 et G6 different-ils du disque de reference (les 9 identiques) ? bbox et couleurs du delta.
from PIL import Image
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
REF=(347.5,552.5)  # G1, membre du groupe de 9
def disc(cx,cy,S=20):
    X,Y=int(cx)-S//2,int(cy)-S//2
    return [[px[X+i,Y+j] for i in range(S)] for j in range(S)],X,Y
R,_,_=disc(*REF)
for nom,(cx,cy) in {'G5':(347.5,744.5),'G6':(539.5,744.5),'G2':(539.5,552.5)}.items():
    D,X,Y=disc(cx,cy)
    diff=[(i,j) for j in range(20) for i in range(20) if D[j][i]!=R[j][i]]
    if not diff: print(f'  {nom} : 0 pixel different du disque de reference'); continue
    xs=[d[0] for d in diff]; ys=[d[1] for d in diff]
    print(f'  {nom} : {len(diff)} px differents ; bbox locale ({min(xs)},{min(ys)})-({max(xs)},{max(ys)}) '
          f'= absolue ({X+min(xs)},{Y+min(ys)})-({X+max(xs)},{Y+max(ys)})')
    from collections import Counter
    c=Counter(D[j][i] for i,j in diff)
    print('     couleurs du delta (top 6) :', c.most_common(6))
