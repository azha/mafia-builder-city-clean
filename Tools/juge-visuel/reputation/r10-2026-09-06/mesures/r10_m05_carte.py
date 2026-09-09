# r10-m05 : bbox de la carte portrait .prt (bordure DOREE) dans le repere du cadre.
# Controle positif : le filet dore du CADRE lui-meme est retrouve aux memes v que m01.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,1058,2078),
    "CAP":(D+"capture-1080x2400.png",18,18,1061,1644)}
def gold(p):
    r,g,b=p
    return r>110 and g>85 and b<120 and (r-b)>50 and (g-b)>20
for k,(p,x0,y0,x1,y1) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"{k} taille={im.size}")
    # bande gauche = colonne portrait : u de 40 a 500
    xa,xb=x0+40,x0+500
    hor=[y for y in range(y0+380,y0+1170) if sum(1 for x in range(xa,xb) if gold(px[x,y]))>0.9*(xb-xa)]
    grp=[]
    for y in hor:
        if grp and y-grp[-1][-1]<=2: grp[-1].append(y)
        else: grp.append([y])
    print("   filets dores HORIZONTAUX de la carte : ", [(g[0]-y0,g[-1]-y0) for g in grp])
    ya,yb=y0+430,y0+1100
    ver=[x for x in range(x0+20,x0+540) if sum(1 for y in range(ya,yb) if gold(px[x,y]))>0.9*(yb-ya)]
    grp=[]
    for x in ver:
        if grp and x-grp[-1][-1]<=2: grp[-1].append(x)
        else: grp.append([x])
    print("   filets dores VERTICAUX de la carte  : ", [(g[0]-x0,g[-1]-x0) for g in grp])
