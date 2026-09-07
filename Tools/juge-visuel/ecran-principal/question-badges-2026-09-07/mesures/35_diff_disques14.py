# Diff sur la boite 14x14 de l anneau (celle qui donnait 9 empreintes identiques).
from PIL import Image
from collections import Counter
SRC='../capture-nuit-1080x1920.png'
im=Image.open(SRC); px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
def box14(cx,cy):
    X,Y=int(cx-6.5),int(cy-6.5)
    return [[px[X+i,Y+j] for i in range(14)] for j in range(14)],X,Y
R,_,_=box14(347.5,552.5)
for nom,(cx,cy) in {'G5':(347.5,744.5),'G6':(539.5,744.5)}.items():
    D,X,Y=box14(cx,cy)
    diff=[(i,j) for j in range(14) for i in range(14) if D[j][i]!=R[j][i]]
    xs=[d[0] for d in diff]; ys=[d[1] for d in diff]
    print(f'  {nom} : {len(diff)} px sur 196 differents ; bbox absolue ({X+min(xs)},{Y+min(ys)})-({X+max(xs)},{Y+max(ys)})')
    print('     couleurs :', Counter(D[j][i] for i,j in diff).most_common(8))
    print('     carte (X = different) :')
    for j in range(14):
        print('       '+''.join('X' if (i,j) in diff else '.' for i in range(14)))
