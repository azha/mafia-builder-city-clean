# r10-m10 : couleurs d'aplat (mediane d'une fenetre 9x9, a >=4 px de tout bord).
# Controle positif : le fond hors cadre doit etre quasi identique des deux cotes.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
# points en coordonnees CADRE (u,v) - choisis sur des aplats larges des DEUX cotes
PTS_REF={"peau (joue gauche)":(163,700),"col creme (triangle)":(272,880),
   "buste noir (epaule gauche)":(140,1010),"fond carte .prt":(100,560),
   "fond .elast":(500,1100),"fond fenetre .fen":(150,300),"fond tuile .tl":(560,700),
   "fond .pann":(500,1300),"fond CTA":(500,1550),"fond du cadre (gouttiere gauche)":(10,900),
   "coiffe (sommet)":(272,560)}
PTS_CAP={"peau (joue gauche)":(158,700),"col creme (triangle)":(266,880),
   "buste noir (epaule gauche)":(120,1010),"fond carte .prt":(90,560),
   "fond .elast":(495,1100),"fond fenetre .fen":(150,300),"fond tuile .tl":(560,660),
   "fond .pann":(500,1310),"fond CTA":(500,1550),"fond du cadre (gouttiere gauche)":(10,900),
   "coiffe (sommet)":(266,545)}
def med(px,x0,y0,u,v):
    vals=[px[x0+u+dx,y0+v+dy] for dx in range(-4,5) for dy in range(-4,5)]
    return tuple(sorted(c[i] for c in vals)[len(vals)//2] for i in range(3))
res={}
for k,(p,x0,y0) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load(); print(f"{k} taille={im.size}")
    P=PTS_REF if k=="REF" else PTS_CAP
    res[k]={n:med(px,x0,y0,u,v) for n,(u,v) in P.items()}
print(f"{'aplat':34s} {'REF':>16s} {'CAP':>16s}   dmax")
for n in PTS_REF:
    a,b=res["REF"][n],res["CAP"][n]
    print(f"{n:34s} {str(a):>16s} {str(b):>16s}   {max(abs(a[i]-b[i]) for i in range(3))}")
