# r10-m06 : bbox horizontal des tuiles .tl + gouttiere carte/tuiles + padding .elast.
# Controle positif : les 4 tuiles ont le meme u0/u1 a <=1 px de chaque cote.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,1058,2078,[(548,646),(663,761),(779,876),(894,992)]),
    "CAP":(D+"capture-1080x2400.png",18,18,1061,1644,[(516,606),(623,713),(731,820),(838,927)])}
def lisere(p):
    r,g,b=p
    return 28<=r<=95 and 38<=g<=110 and 50<=b<=130 and b>r+6 and (r+g+b)>110
for k,(p,x0,y0,x1,y1,tuiles) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"{k} taille={im.size}")
    for i,(a,b) in enumerate(tuiles,1):
        ya,yb=y0+a+6,y0+b-6
        ver=[x for x in range(x0+480,x1) if sum(1 for y in range(ya,yb) if lisere(px[x,y]))>0.9*(yb-ya)]
        grp=[]
        for x in ver:
            if grp and x-grp[-1][-1]<=2: grp[-1].append(x)
            else: grp.append([x])
        e=[(g[0]-x0,g[-1]-x0) for g in grp]
        print(f"   tuile {i}: bords verticaux u={e}  -> largeur={e[-1][1]-e[0][0] if len(e)>=2 else '?'}")
