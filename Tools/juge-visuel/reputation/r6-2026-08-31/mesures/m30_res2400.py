# m30 - 1080x2400 : le cadre est-il identique au 1080x1920 ? rien de coupe ? ou va la hauteur en plus ?
from PIL import Image
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
a=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB")
b=Image.open(S+"screen_b3_reputation_2400.png").convert("RGB") if False else Image.open(S+"screen_b3_reputation_1080x2400.png").convert("RGB")
print("1920",a.size,"2400",b.size)
pa,pb=a.load(),b.load()
n=0;mx=0
for y in range(18,1645):
    for x in range(18,1062):
        d=max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))
        if d>2: n+=1; mx=max(mx,d)
print(f"interieur du cadre (18..1061 x 18..1644) : pixels differents de plus de 2/255 = {n} (max {mx})")
# [ctrl neg] la meme fenetre decalee de 40px doit differer
n2=0
for y in range(18,1645):
    for x in range(18,1062):
        if max(abs(pa[x,y][i]-pb[x,y+40][i]) for i in range(3))>2: n2+=1
print(f"[ctrl neg] meme fenetre decalee de 40 px : {n2} pixels differents")
# le cadre touche-t-il le bas ? derniere ligne non-fond
print("dernier y du cadre en 2400 : cherche la bordure doree basse")
def gold(p):
    r,g,b=p; return r>120 and g>90 and b<110 and r>=g>b+30
for y in range(2399,0,-1):
    if sum(1 for x in range(20,1060,4) if gold(pb[x,y]))>100: print("  bordure doree pleine largeur la plus basse : y =",y); break
print("hauteur libre sous le cadre : 1920 ->",1920-1644,"px ; 2400 ->",2400-1644,"px")
