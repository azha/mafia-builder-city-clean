# m02 - rect exact du CONTENU : lignes/colonnes strictement uniformes (letterbox)
from PIL import Image
def uniform_rows(path):
    im=Image.open(path).convert('RGB'); W,H=im.size; px=im.load()
    print(f"--- {path} {im.size}")
    uni=[]
    for y in range(H):
        c0=px[0,y]; u=True
        for x in range(0,W,3):
            if px[x,y]!=c0: u=False; break
        uni.append(u)
    # segments
    y=0
    while y<H:
        if uni[y]:
            y0=y
            while y<H and uni[y]: y+=1
            print(f"   lignes UNIFORMES {y0}..{y-1}  couleur={px[0,y0]}")
        else: y+=1
    # colonnes uniformes
    unic=[]
    for x in range(W):
        c0=px[x,0]; u=True
        for y in range(0,H,3):
            if px[x,y]!=c0: u=False; break
        unic.append(u)
    x=0
    while x<W:
        if unic[x]:
            x0=x
            while x<W and unic[x]: x+=1
            print(f"   colonnes UNIFORMES {x0}..{x-1} couleur={px[x0,0]}")
        else: x+=1
for p in ['../capture-hors-chrome-1080x2400.png']:
    uniform_rows(p)
