# r10-m21 : l'ellipse claire du bas-gauche du buste — PLUS GRANDE COMPOSANTE CONNEXE du
#  remplissage rang (#232a2d). Controle positif du detecteur d'OR : il doit trouver le titre
#  « Le miroir » (or_vif) dans l'enseigne ; controle sur la carte : 0 px = pas de montre.
from PIL import Image
from collections import deque
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080),(577,954),272.5,5.486),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074),(572,948),254.5,5.472)}
def rang(p): r,g,b=p; return abs(r-35)<12 and abs(g-42)<12 and abs(b-45)<12
def orvif(p): r,g,b=p; return abs(r-242)<34 and abs(g-201)<34 and abs(b-107)<42
for k,(p,x0,y0,(cu0,cv0,cu1,cv1),(etop,ebot),cu,ech) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k} taille={im.size}")
    S={(u,v) for v in range(cv0+14,cv1-13) for u in range(cu0+14,cu1-13) if rang(px[x0+u,y0+v])}
    comps=[]; seen=set()
    for s in S:
        if s in seen: continue
        q=deque([s]); seen.add(s); c=[]
        while q:
            u,v=q.popleft(); c.append((u,v))
            for du,dv in ((1,0),(-1,0),(0,1),(0,-1),(1,1),(1,-1),(-1,1),(-1,-1)):
                n=(u+du,v+dv)
                if n in S and n not in seen: seen.add(n); q.append(n)
        comps.append(c)
    comps.sort(key=len,reverse=True)
    print(f"  {len(comps)} composantes de remplissage 'rang' ; tailles : {[len(c) for c in comps[:4]]}")
    c=comps[0]; us=[a for a,_ in c]; vs=[b for _,b in c]
    u0,u1,v0,v1=min(us),max(us),min(vs),max(vs)
    print(f"  PLUS GRANDE : u {u0}..{u1} ({u1-u0+1} px = {(u1-u0+1)/ech:.2f} u)  "
          f"v {v0}..{v1} ({v1-v0+1} px = {(v1-v0+1)/ech:.2f} u)  aire={len(c)}  "
          f"remplissage={len(c)/((u1-u0+1)*(v1-v0+1)):.3f}")
    print(f"     centre SVG = ({31+((u0+u1)/2-cu)/ech:.2f}, {78+((v0+v1)/2-ebot)/ech+1:.2f}) u"
          f"   (gant attendu : 12,0 ; 75,0 — rx=5 ry=3,4 -> 10,0 x 6,8 u trait exterieur compris)")
    print(f"     position dans la CARTE : centre ({100*((u0+u1)/2-cu0)/(cu1-cu0):.1f} %, "
          f"{100*((v0+v1)/2-cv0)/(cv1-cv0):.1f} %) ; taille {(u1-u0+1)/ech:.2f} x {(v1-v0+1)/ech:.2f} u")
    # or
    nor=sum(1 for v in range(cv0+14,cv1-13) for u in range(cu0+14,cu1-13) if orvif(px[x0+u,y0+v]))
    ntitre=sum(1 for v in range(55,115) for u in range(300,740) if orvif(px[x0+u,y0+v]))
    print(f"  OR or_vif dans la carte : {nor} px  |  CONTROLE POSITIF (titre « Le miroir ») : {ntitre} px")
