# r10-m08 : profil horizontal de la ligne de balayage, EN DELTA sur son propre fond local
# (score teal a la ligne moins score teal 14 px au-dessus) -> insensible au fond de la tuile.
# Controle positif : le delta doit tomber a ~0 en dehors du panneau .elast (u<20 et u>1020).
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(631,638)),
    "CAP":(D+"capture-1080x2400.png",18,18,(615,621))}
def sc(p): return (p[1]+p[2])/2.0-p[0]
for k,(p,x0,y0,(va,vb)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"{k} taille={im.size} ligne v={va}..{vb} ({vb-va+1} px)")
    prof=[]
    for u in range(0,1044,4):
        if x0+u>=im.size[0]: break
        a=sum(sc(px[x0+u,y0+v]) for v in range(va,vb+1))/(vb-va+1)
        b=sum(sc(px[x0+u,y0+v-16]) for v in range(va,vb+1))/(vb-va+1)
        prof.append((u,a-b))
    ext=[(u,round(d,1)) for u,d in prof if u in (0,8,40,80,120,200,300,400,500,600,700,800,900,960,1000,1020,1036)]
    print("   delta teal par u :", ext)
    mx=max(prof,key=lambda t:t[1]); print("   pic :",mx[0],round(mx[1],1))
