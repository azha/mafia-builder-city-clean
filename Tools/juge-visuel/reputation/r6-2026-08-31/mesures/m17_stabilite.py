# m17 - stabilite T / T+1s : compte les pixels differents. Controle negatif : 1920 vs 2400 (doit differer).
from PIL import Image
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
a=Image.open(S+"screen_b3_reputation_1080x1920.png").convert("RGB")
b=Image.open(S+"screen_b3_reputation_1080x1920_t1s.png").convert("RGB")
c=Image.open(S+"screen_b3_reputation_1080x2400.png").convert("RGB")
print("T",a.size,"T+1s",b.size,"2400",c.size)
pa,pb=a.load(),b.load(); n=0;mx=0
for y in range(a.size[1]):
    for x in range(a.size[0]):
        d=max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))
        if d>0: n+=1; mx=max(mx,d)
print(f"T vs T+1s : pixels differents = {n} / {a.size[0]*a.size[1]}  ecart max canal = {mx}")
# controle negatif : haut de 1920 vs haut de 2400 sur la meme bande (le cadre doit etre au meme endroit -> egal)
pc=c.load(); n2=0
for y in range(0,1700):
    for x in range(a.size[0]):
        if pa[x,y]!=pc[x,y]: n2+=1
print(f"[ctrl neg] 1920 vs 2400, bande y<1700 : pixels differents = {n2}")
n3=0
for y in range(1700,1920):
    for x in range(a.size[0]):
        if pa[x,y]!=pc[x,y]: n3+=1
print(f"[ctrl neg] 1920 vs 2400, bande y 1700..1920 (fond seul) : pixels differents = {n3}")
