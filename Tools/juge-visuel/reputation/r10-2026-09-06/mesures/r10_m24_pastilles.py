# r10-m24 : pastilles .lum des 4 tuiles (etat VIERGE : toutes eteintes) — diametre, couleur, position.
# Controle positif : les 4 pastilles d'une meme capture doivent avoir le meme diametre a +-1 px.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,[(548,646),(663,761),(779,876),(894,992)],521),
    "CAP":(D+"capture-1080x2400.png",18,18,[(516,606),(623,713),(731,820),(838,927)],515)}
def clair(p,bg): return sum(p)>sum(bg)+40
for k,(p,x0,y0,TU,tu0) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k} taille={im.size}")
    bg=px[x0+tu0+15,y0+TU[0][0]+15]
    for i,(a,b) in enumerate(TU,1):
        S={(u,v) for v in range(a+6,b-5) for u in range(tu0+6,tu0+90) if clair(px[x0+u,y0+v],bg)}
        if not S: print(f"  tuile {i}: aucune pastille"); continue
        us=[u for u,_ in S]; vs=[v for _,v in S]
        cu=(min(us)+max(us))/2; cv=(min(vs)+max(vs))/2
        c=px[x0+int(cu),y0+int(cv)]
        print(f"  tuile {i}: pastille u {min(us)}..{max(us)} ({max(us)-min(us)+1} px) "
              f"v {min(vs)}..{max(vs)} ({max(vs)-min(vs)+1} px)  couleur={c}  "
              f"centre a u-tuile={cu-tu0:.1f}  v-tuile={cv-a:.1f} / hauteur {b-a}")
