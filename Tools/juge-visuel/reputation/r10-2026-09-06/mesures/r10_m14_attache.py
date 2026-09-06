# r10-m14 : hauteur d'ATTACHE de la coiffe. L'epaisseur d'encre laterale au visage vaut
#  (trait de contour) + (coiffe). Ligne de base = epaisseur mesuree au BAS du visage (75-90 %),
#  ou aucune coiffe ne peut exister. L'attache = derniere ligne ou l'epaisseur depasse
#  la ligne de base de >= 4 px, des DEUX cotes.
# Controle positif : la ligne de base doit etre ~ egale a gauche et a droite (symetrie du trait).
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
    vis=[v for v,us in P.items() if max(us)-min(us)+1>=0.6*lmax]
    vtop,vbot=min(vis),max(vis); h=vbot-vtop+1
    def ep(v):
        if v not in P or v not in E: return None
        pu0,pu1=min(P[v]),max(P[v])
        g=len([u for u in E[v] if pu0-70<u<pu0]); d=len([u for u in E[v] if pu1<u<pu1+70])
        return g,d
    base=[ep(int(vtop+f*h)) for f in (0.72,0.76,0.80,0.84)]
    base=[b for b in base if b]
    bg=sum(b[0] for b in base)/len(base); bd=sum(b[1] for b in base)/len(base)
    print(f"\n=== {k} taille={im.size}  visage v[{vtop},{vbot}] h={h} l={lmax}")
    print(f"  ligne de base du TRAIT (72-84 % du visage) : G={bg:.1f} px  D={bd:.1f} px"
          f"   (controle positif : G≈D, ecart {abs(bg-bd):.1f})")
    att=None
    print("   %visage    G     D    (G-base)  (D-base)")
    for i in range(0,21):
        f=i*0.025; v=int(vtop+f*h); e=ep(v)
        if not e: continue
        g,d=e
        print(f"    {f*100:5.1f} %  {g:4d}  {d:4d}     {g-bg:+6.1f}   {d-bd:+6.1f}")
        if g-bg>=4 and d-bd>=4: att=f*100
    print(f"  (b) HAUTEUR D'ATTACHE (derniere ligne ou coiffe >= 4 px des deux cotes) = {att} % de la hauteur du visage")
