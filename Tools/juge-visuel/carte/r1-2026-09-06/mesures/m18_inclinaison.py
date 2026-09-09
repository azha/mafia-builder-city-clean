# m18 : inclinaison et position des marqueurs de nom.
# REF : encre creme (r>150, g>135, r-b entre 18 et 70) -> exclut les pastilles or (b bas),
# le corail des ecussons (g bas), le teal (r bas) et les batiments blanc-bleute (r-b<=0).
# On ajuste une droite sur les centroides par tranche de 12 px -> angle.
# CAP : le texte est dans une plaque horizontale -> angle attendu 0.
# Controle positif : "LE THRENNY" (peint) doit donner le MEME angle des deux cotes.
from PIL import Image
import math, statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
creme=lambda p: p[0]>150 and p[1]>135 and 18<=p[0]-p[2]<=70
def angle(px,x0,y0,x1,y1,pred,pas=12):
    pts=[]
    x=x0
    while x+pas<=x1:
        ys=[y for y in range(y0,y1) for xx in range(x,x+pas) if pred(px[xx,y])]
        if len(ys)>=8: pts.append((x+pas/2, statistics.mean(ys)))
        x+=pas
    if len(pts)<3: return None,len(pts)
    n=len(pts); mx=sum(p[0] for p in pts)/n; my=sum(p[1] for p in pts)/n
    num=sum((p[0]-mx)*(p[1]-my) for p in pts); den=sum((p[0]-mx)**2 for p in pts)
    a=num/den
    return math.degrees(math.atan(a)), n
cas=[('LES BASSINS',(95,440,275,500)),('QUAI-NORD',(400,440,640,500)),
     ('HAUTES-MARCHES',(430,668,725,712)),('SAINT-BRAND',(78,902,300,945)),
     ('DEPOT-EST',(830,895,1006,945)),('MARNE-BASSE',(435,1378,662,1404)),
     ('LES FRICHES',(390,1895,630,1935)),('PONT-GRIS',(800,1888,1010,1932))]
print(f"\n{'nom':16s} {'angle REF':>10} {'n':>3}   (positif = descend vers la droite)")
for nom,(x0,y0,x1,y1) in cas:
    a,n=angle(rp,x0,y0,x1,y1,creme)
    print(f"{nom:16s} {a:>10.2f}deg {n:>3}" if a is not None else f"{nom:16s}   indetermine ({n} tranches)")
print("\nCAPTURE : le texte est dans une plaque horizontale ; angle mesure sur 3 plaques")
blanc=lambda p: p[0]>190 and p[1]>190 and p[2]>190
for nom,(x0,y0,x1,y1) in [('LES BASSINS',(115,488,220,510)),('HAUTES-MARCHES',(508,710,655,732)),('PONT-GRIS',(860,1948,950,1970))]:
    a,n=angle(cp,x0,y0,x1,y1,blanc,pas=10)
    print(f"{nom:16s} {a:>10.2f}deg {n:>3}" if a is not None else f"{nom:16s}   indetermine ({n})")
print("\nCONTROLE POSITIF : 'LE THRENNY' peint dans la texture, des deux cotes")
a1,n1=angle(rp,440,1120,700,1165,lambda p:p[0]>110 and p[1]>110 and p[2]>110,pas=14)
a2,n2=angle(cp,440,1148,700,1195,lambda p:p[0]>110 and p[1]>110 and p[2]>110,pas=14)
print(f"  REF {a1:.2f}deg (n={n1})   CAP {a2:.2f}deg (n={n2})")
