# r10-m27 : les mots en OR du paragraphe .pann (« rien pris de vous », « indetermine » : .pann small u
#  -> or_vif, gras). Compte des pixels or_vif par ligne du paragraphe.
# Controle positif : le titre « Le miroir » (or_vif) rend >3000 px avec le meme detecteur.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,[(1338,1362),(1371,1395),(1404,1428)]),
    "CAP":(D+"capture-1080x2400.png",18,18,[(1346,1370),(1373,1398),(1401,1425)])}
def orv(p): r,g,b=p; return abs(r-242)<34 and abs(g-201)<34 and abs(b-107)<45
for k,(p,x0,y0,LN) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n{k} taille={im.size}")
    print("  CONTROLE + titre :", sum(1 for v in range(55,115) for u in range(300,740) if orv(px[x0+u,y0+v])),"px")
    for i,(a,b) in enumerate(LN,1):
        us=[u for v in range(a,b) for u in range(60,1000) if orv(px[x0+u,y0+v])]
        print(f"  ligne {i} (v {a}..{b}) : {len(us)} px d'or"
              + (f"  u {min(us)}..{max(us)}" if us else ""))
