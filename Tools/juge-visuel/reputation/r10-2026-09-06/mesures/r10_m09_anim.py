# r10-m09 : T vs T+1 s -> nombre de pixels differents. Controle positif : la meme comparaison
# entre 1080x1920 et le HAUT de 1080x2400 doit rendre un nombre NON nul (l'instrument discrimine).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
a=Image.open(D+"capture-1080x1920.png").convert("RGB")
b=Image.open(D+"capture-1080x1920-t1s.png").convert("RGB")
print("T   :",a.size,"  T+1s:",b.size)
pa,pb=a.load(),b.load()
n=0; mx=0
for y in range(a.size[1]):
    for x in range(a.size[0]):
        d=max(abs(pa[x,y][i]-pb[x,y][i]) for i in range(3))
        if d>0: n+=1; mx=max(mx,d)
print(f"   pixels differents T vs T+1s : {n} / {a.size[0]*a.size[1]}  (delta max {mx})")
c=Image.open(D+"capture-1080x2400.png").convert("RGB").crop((0,0,1080,1920))
pc=c.load(); n2=0
for y in range(0,1920,3):
    for x in range(0,1080,3):
        if max(abs(pa[x,y][i]-pc[x,y][i]) for i in range(3))>0: n2+=1
print(f"   CONTROLE POSITIF (1920 vs haut de 2400, 1 px sur 9) : {n2} differents -> l'instrument discrimine" if n2 else "   CONTROLE POSITIF ECHOUE")
import hashlib
for f in ["capture-1080x1920.png","capture-1080x1920-t1s.png","capture-1080x2400.png"]:
    print("   sha256",f,hashlib.sha256(open(D+f,'rb').read()).hexdigest()[:16])
