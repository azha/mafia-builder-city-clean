# r10-m32 : le gant deborde-t-il du torse ? On prend la composante connexe du gant (m21) et on
#  compte, ligne par ligne, ses pixels situes A GAUCHE du bord gauche de l'encre du torse.
# Controle positif : la meme mesure sur le bord DROIT du gant (largement a l'interieur) doit
#  rendre 0 ; controle negatif : en decalant artificiellement le gant de 40 px a gauche, > 0.
from PIL import Image
from collections import deque, defaultdict
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def rang(p): return abs(p[0]-35)<12 and abs(p[1]-42)<12 and abs(p[2]-72-(-27))<12
def rang2(p): return abs(p[0]-35)<12 and abs(p[1]-42)<12 and abs(p[2]-45)<12
def encre(p): return p[0]<32 and p[1]<32 and p[2]<32
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    S={(u,v) for v in range(cv0+14,cv1-13) for u in range(cu0+14,cu1-13) if rang2(px[x0+u,y0+v])}
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
    comps.sort(key=len,reverse=True); G=comps[0]
    E=defaultdict(list)
    for v in range(cv0+14,cv1-13):
        for u in range(cu0+14,cu1-13):
            if encre(px[x0+u,y0+v]): E[v].append(u)
    byv=defaultdict(list)
    for u,v in G: byv[v].append(u)
    deb=0; debd=0; deb40=0
    for v,us in byv.items():
        if v not in E: continue
        eg,ed=min(E[v]),max(E[v])
        deb+=len([u for u in us if u<eg]); debd+=len([u for u in us if u>ed])
        deb40+=len([u for u in us if u-40<eg])
    print(f"{k} taille={im.size}  gant aire={len(G)}")
    print(f"   pixels du gant a GAUCHE du bord d'encre du torse : {deb}")
    print(f"   CONTROLE + : pixels a DROITE du bord d'encre (doit etre 0) : {debd}")
    print(f"   CONTROLE - : gant decale de 40 px a gauche -> {deb40} pixels dehors (doit etre > 0)")
