# m7 — bords horizontaux des cartes : la carte est PLUS CLAIRE que le fond (l'ombre portee, elle,
# est plus SOMBRE) -> on ne retient que les colonnes dont la mediane est plus claire que le fond+3.
# Bandes y choisies dans le TIERS HAUT de chaque carte pour eviter l'ergot (.rang::before, top:50%).
# Controle positif : reference, largeur du rang attendue 489,07 CSS. Controle negatif : le don-rang
# est plus LARGE (515) que le rang.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0
FR=2.0
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
LC=lum((22,22,28)); LR=lum((22,25,27))

def medcol(px,x,y0,y1):
    v=[[],[],[]]
    for y in range(y0,y1+1):
        p=px[x,y]
        for i in range(3): v[i].append(p[i])
    return tuple(sorted(k)[len(k)//2] for k in v)

def bords(nom,px,y0,y1,base,orig,f,xa,xb,s=3.0):
    xs=[x for x in range(xa,xb) if lum(medcol(px,x,y0,y1))>base+s]
    if not xs: print("  %-16s rien"%nom); return None
    a,b=min(xs),max(xs)
    print("  %-16s px %d..%d  CSS %.2f..%.2f  largeur %.2f"%(nom,a,b,(a-orig)/f,(b-orig)/f,(b-a+1)/f))
    return (a,b)

print("\n== REFERENCE (bandes hautes) ==")
bords("don-rang",r,300,340,LR,0,FR,0,1119)
bords("rang1",r,520,560,LR,0,FR,0,1119)
bords("rang2",r,925,965,LR,0,FR,0,1119)
bords("rang3",r,1275,1315,LR,0,FR,0,1119)
bords("vide1",r,760,800,LR,0,FR,0,1119,1.0)
bords("vide3",r,1510,1550,LR,0,FR,0,1119,1.0)
bords("recruter",r,1690,1730,LR,0,FR,0,1119,1.0)
print("\n== CAPTURE (bandes hautes homologues) ==")
bords("don-rang",c,500,540,LC,CX0,FC,13,1065)
bords("rang1",c,705,745,LC,CX0,FC,13,1065)
bords("rang2",c,1085,1125,LC,CX0,FC,13,1065)
bords("rang3",c,1465,1505,LC,CX0,FC,13,1065)
bords("vide1",c,945,985,LC,CX0,FC,13,1065,1.0)
bords("vide3",c,1700,1740,LC,CX0,FC,13,1065,1.0)
bords("recruter",c,1875,1915,LC,CX0,FC,13,1065,1.0)
