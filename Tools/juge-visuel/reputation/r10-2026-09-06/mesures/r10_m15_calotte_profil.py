# r10-m15 : profil de LARGEUR de la calotte, du sommet de l'encre au sommet du visage.
# Controle positif : la derniere ligne du profil (juste au-dessus du visage) doit etre >= la
#  largeur du visage a cette hauteur des DEUX cotes (la calotte coiffe la tete).
from PIL import Image
from collections import defaultdict
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(61,425,484,1080)),
    "CAP":(D+"capture-1080x2400.png",18,18,(54,417,478,1074))}
def peau(p): r,g,b=p; return r>150 and g>140 and b>110 and r>b+20 and (r-g)<40
def encre(p): r,g,b=p; return r<32 and g<32 and b<32
for k,(p,x0,y0,(cu0,cv0,cu1,cv1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    P=defaultdict(list); E=defaultdict(list)
    for v in range(cv0+14,cv1-13):
        for u in range(cu0+14,cu1-13):
            c=px[x0+u,y0+v]
            if peau(c): P[v].append(u)
            elif encre(c): E[v].append(u)
    lmax=max(max(us)-min(us)+1 for us in P.values())
    vtop=min(v for v,us in P.items() if max(us)-min(us)+1>=0.6*lmax)
    etop=min(E)
    print(f"\n=== {k} taille={im.size}  encre sommet v={etop}  visage sommet v={vtop}  "
          f"hauteur de calotte au-dessus du visage = {vtop-etop} px")
    print("   dv depuis le sommet de la calotte |  largeur d'encre  |  u min..max")
    for v in range(etop, vtop+3):
        if v not in E: continue
        us=[u for u in E[v] if 100<u<450]
        if not us: continue
        print(f"    {v-etop:4d} (v={v})   {max(us)-min(us)+1:5d} px    u {min(us)}..{max(us)}")
