# r10-m25 : pastilles .lum eteintes — composante connexe de couleur 'lisere' (42,54,72) dans le
#  tiers gauche de la tuile, hors liseré de la tuile (marge 8 px).
# Controle positif : les 4 pastilles d'une meme image ont le meme diametre a +-1 px.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,[(548,646),(663,761),(779,876),(894,992)],521,976),
    "CAP":(D+"capture-1080x2400.png",18,18,[(516,606),(623,713),(731,820),(838,927)],515,989)}
def lis(p): return abs(p[0]-42)<12 and abs(p[1]-54)<12 and abs(p[2]-72)<14
for k,(p,x0,y0,TU,tu0,tu1) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k} taille={im.size}")
    for i,(a,b) in enumerate(TU,1):
        S={(u,v) for v in range(a+8,b-7) for u in range(tu0+8,tu0+70) if lis(px[x0+u,y0+v])}
        comps=[];seen=set()
        for s in S:
            if s in seen: continue
            q=deque([s]);seen.add(s);c=[]
            while q:
                u,v=q.popleft(); c.append((u,v))
                for du,dv in ((1,0),(-1,0),(0,1),(0,-1)):
                    n=(u+du,v+dv)
                    if n in S and n not in seen: seen.add(n); q.append(n)
            comps.append(c)
        if not comps: print(f"  tuile {i}: rien"); continue
        comps.sort(key=len,reverse=True); c=comps[0]
        us=[a2 for a2,_ in c]; vs=[b2 for _,b2 in c]
        print(f"  tuile {i}: diam {max(us)-min(us)+1} x {max(vs)-min(vs)+1} px  aire={len(c)}"
              f"  remplissage={len(c)/((max(us)-min(us)+1)*(max(vs)-min(vs)+1)):.3f}"
              f"  centre u-tuile={(min(us)+max(us))/2-tu0:.1f}  v-tuile={(min(vs)+max(vs))/2-a:.1f}/{b-a}"
              f"  couleur={px[x0+(min(us)+max(us))//2,y0+(min(vs)+max(vs))//2]}")
