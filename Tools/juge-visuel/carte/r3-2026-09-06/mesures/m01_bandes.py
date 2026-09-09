# m01 - reperage des bandes horizontales (chrome / contenu / letterbox)
# controle positif: la largeur des images est 1080 des deux cotes
from PIL import Image
import statistics, sys

def prof(path):
    im = Image.open(path).convert('RGB')
    print(f"--- {path}  taille={im.size}")
    W,H = im.size
    px = im.load()
    rows=[]
    for y in range(H):
        vals=[px[x,y] for x in range(0,W,7)]
        r=[v[0] for v in vals]; g=[v[1] for v in vals]; b=[v[2] for v in vals]
        med=(statistics.median(r),statistics.median(g),statistics.median(b))
        # ecart-type d'une ligne : une ligne de chrome uni a un ecart faible
        sd=statistics.pstdev([0.299*v[0]+0.587*v[1]+0.114*v[2] for v in vals])
        rows.append((y,med,sd))
    return rows

for p in ['../reference-1080x2102.png','../capture-1080x2400.png','../capture-1080x1920.png','../capture-hors-chrome-1080x2400.png']:
    rows=prof(p)
    # imprime les transitions ou sd franchit 8
    prev=None
    for y,med,sd in rows:
        st = 'UNI' if sd<8 else 'VAR'
        if st!=prev:
            print(f"  y={y:5d} -> {st}  med={med} sd={sd:.1f}")
            prev=st
