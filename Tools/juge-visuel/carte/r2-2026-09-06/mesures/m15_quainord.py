# m15 — QUAI-NORD dans la REFERENCE : le dossier demande de NOMMER l'objet mesure.
# Trois objets distincts se touchent la : (a) le MOT "QUAI-NORD" (encre creme #e0d6bd, cap ~18 px),
# (b) le LIBELLE "CHASSE" de l'ecusson n.1 (.ecusson .l, fill #b3a88f, cap ~8 px, ecusson NON tourne),
# (c) le CHIFFRE "1" de l'ecusson (fill #ff8a70, r-b=143, hors filtre creme).
# Je mesure (a) et (b) separement, puis la fenetre LARGE qui les melange.
from PIL import Image
import math, statistics
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,"reference-1080x2102.png")).convert("RGB"); RP=ref.load()
print("OUVERT ref",ref.size)
def cream(p):
    R,G,B=p; L=0.2126*R+0.7152*G+0.0722*B
    return L>110 and 10<=(R-B)<=95 and G>100
def cream_faible(p):
    R,G,B=p; L=0.2126*R+0.7152*G+0.0722*B
    return L>85 and 5<=(R-B)<=95 and G>80
def reg(px,box,f,hmin):
    x0,y0,x1,y1=box
    ps=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if f(px[x,y])]
    cols={}
    for x,y in ps: cols.setdefault(x,[]).append(y)
    ks=sorted(k for k in cols if (max(cols[k])-min(cols[k])+1)>=hmin)
    if len(ks)<8: return (None,None,None,None,None),len(ps),0
    P=[(k,max(cols[k])) for k in ks]
    n=len(P);mx=sum(p[0] for p in P)/n;my=sum(p[1] for p in P)/n
    sxy=sum((p[0]-mx)*(p[1]-my) for p in P);sxx=sum((p[0]-mx)**2 for p in P)
    a=sxy/sxx
    r=statistics.pstdev([p[1]-(my+a*(p[0]-mx)) for p in P])
    hs=[]
    for i in range(0,max(1,len(ks)-5),3):
        sl=[y for k in ks[i:i+6] for y in cols[k]]; hs.append(max(sl)-min(sl)+1)
    hs.sort()
    return (round(math.degrees(math.atan(a)),2), round(r,2), hs[len(hs)//2], min(ks), max(ks)), len(ps), len(ks)
print("(a) le MOT 'QUAI-NORD' seul, fenetre (455,448)-(650,515), encre creme, colonnes de cap >= 11 px")
r,n,k=reg(RP,(455,448,650,515),cream,11); print(f"    -> angle {r[0]:+.2f} deg, residu {r[1]} px, hcap {r[2]} px, x {r[3]}..{r[4]}, {n} px d'encre, {k} colonnes")
print("(b) le LIBELLE 'CHASSE' de l'ecusson n.1, fenetre (370,420)-(452,448), seuil abaisse, cap >= 5 px")
r2,n2,k2=reg(RP,(396,446,456,468),cream_faible,5); print(f"    -> angle {r2[0]} deg, residu {r2[1]} px, hcap {r2[2]} px, x {r2[3]}..{r2[4]}, {n2} px d'encre, {k2} colonnes")
print("(c) fenetre LARGE (370,420)-(650,515) qui englobe les deux, meme reglage que (a)")
r3,n3,k3=reg(RP,(396,440,650,515),cream,11); print(f"    -> angle {r3[0]} deg, residu {r3[1]} px, hcap {r3[2]} px, x {r3[3]}..{r3[4]}, {n3} px d'encre, {k3} colonnes")
print("(d) fenetre LARGE avec seuil abaisse et cap >= 5 px (melange assume)")
r4,n4,k4=reg(RP,(396,440,650,515),cream_faible,5); print(f"    -> angle {r4[0]} deg, residu {r4[1]} px, hcap {r4[2]} px, x {r4[3]}..{r4[4]}, {n4} px d'encre, {k4} colonnes")
print("\nSOURCE (aide de lecture) : ecrans-brennar-6.html cadre #22 -> <text class=\"nomq\" ... rotate(-10 152.8 69.6)>QUAI-NORD")
