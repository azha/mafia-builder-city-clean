# r10-m20 : l'ellipse claire du bas-gauche du buste. On la NOMME par sa position et sa taille,
#  puis on la rapporte a l'element du SVG (generateur-reputation.py:127-132 : ellipse cx=12 cy=75
#  rx=5 ry=3,4, remplissage T['rang'] quand gloves != clean ; la MONTRE, elle, est un rect
#  x=46 y=72 w=8 h=3,4 rempli or_vif, et n'est dessinee que si watch=='visible').
# Region de recherche : quart bas-gauche de la carte portrait uniquement.
# Controle positif : compte des pixels OR (or_vif #f2c96b +-30) dans TOUTE la carte -> doit dire
#  s'il y a une montre. Controle negatif : le meme detecteur d'or sur le filet de la carte > 0.
from PIL import Image
from collections import defaultdict
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080),(577,954),272.5,5.486),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074),(572,948),254.5,5.472)}
def rang(p): r,g,b=p; return abs(r-35)<10 and abs(g-42)<10 and abs(b-45)<10
def orvif(p): r,g,b=p; return abs(r-242)<32 and abs(g-201)<32 and abs(b-107)<40
for k,(p,x0,y0,(cu0,cv0,cu1,cv1),(etop,ebot),cu,ech) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k} taille={im.size}  carte u[{cu0},{cu1}] v[{cv0},{cv1}]  buste v[{etop},{ebot}] centre_u={cu}")
    # quart bas-gauche du buste
    M=defaultdict(list)
    for v in range(ebot-int(14*ech), ebot+1):
        for u in range(cu0+14, int(cu)):
            if rang(px[x0+u,y0+v]): M[v].append(u)
    if M:
        vs=sorted(M); us=[u for l in M.values() for u in l]
        u0,u1=min(us),max(us); v0,v1=vs[0],vs[-1]
        print(f"  ELLIPSE CLAIRE : u {u0}..{u1} ({u1-u0+1} px = {(u1-u0+1)/ech:.2f} u)  "
              f"v {v0}..{v1} ({v1-v0+1} px = {(v1-v0+1)/ech:.2f} u)  n={len(us)}")
        gx=31+((u0+u1)/2-cu)/ech; gy=78+((v0+v1)/2-ebot)/ech+1
        print(f"     centre SVG = ({gx:.2f}, {gy:.2f}) u   (attendu gant : 12,0 ; 75,0)")
        print(f"     en % de la carte : centre a ({100*((u0+u1)/2-cu0)/(cu1-cu0):.1f} %, "
              f"{100*((v0+v1)/2-cv0)/(cv1-cv0):.1f} %) ; taille {100*(u1-u0+1)/(cu1-cu0):.1f} % x "
              f"{100*(v1-v0+1)/(cv1-cv0):.1f} % de la carte")
        print(f"     remplissage aire/boite = {len(us)/((u1-u0+1)*(v1-v0+1)):.3f}  (ellipse pleine -> 0,785)")
    # or dans la carte
    n=sum(1 for v in range(cv0+14,cv1-13) for u in range(cu0+14,cu1-13) if orvif(px[x0+u,y0+v]))
    nf=sum(1 for v in range(cv0,cv0+3) for u in range(cu0,cu1) if orvif(px[x0+u,y0+v]))
    print(f"  OR (or_vif +-32) DANS la carte (hors filet) : {n} px   |  CONTROLE NEGATIF sur le filet dore : {nf} px")
