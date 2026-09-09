# m9 — bords des cartes par le canal BLEU (la carte est plus BLEUE que la feuille ; l'ombre portee,
# elle, est plus SOMBRE sur les trois canaux : DeltaB<0). Balayage x a partir de CSS 40 (au-dela du
# rail principal, x CSS 31,7). Controle positif : largeur CSS calculee du rang = 489,07 ; controle
# negatif : le meme detecteur sur une bande de fond pur doit ne rien rendre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,"capture-1080x2400.png")).convert("RGB")
ref=Image.open(os.path.join(D,"reference-1120.png")).convert("RGB")
print("capture",cap.size,"reference",ref.size)
c=cap.load(); r=ref.load()
CX0,CY0,FC=13,232,1053/560.0
FR=2.0
BB_C=28; BB_R=27

def medcol_B(px,x,y0,y1):
    v=[px[x,y][2] for y in range(y0,y1+1)]
    return sorted(v)[len(v)//2]
def medrow_B(px,y,x0,x1):
    v=[px[x,y][2] for x in range(x0,x1+1)]
    return sorted(v)[len(v)//2]

def bordsX(nom,px,y0,y1,bb,ox,f,xa,xb,s=4):
    xs=[x for x in range(xa,xb) if medcol_B(px,x,y0,y1)-bb>s]
    if not xs: print("  %-16s rien"%nom); return
    a,b=min(xs),max(xs)
    print("  %-16s x px %d..%d  CSS %.2f..%.2f  largeur %.2f"%(nom,a,b,(a-ox)/f,(b-ox)/f,(b-a+1)/f))
def bordsY(nom,px,x0,x1,bb,oy,f,ya,yb,s=4):
    ys=[y for y in range(ya,yb) if medrow_B(px,y,x0,x1)-bb>s]
    if not ys: print("  %-16s rien"%nom); return
    a,b=min(ys),max(ys)
    print("  %-16s y px %d..%d  CSS %.2f..%.2f  hauteur %.2f"%(nom,a,b,(a-oy)/f,(b-oy)/f,(b-a+1)/f))

def PX(v,o,f): return int(round(o+v*f))
print("\n== REFERENCE : bords X (bande y = milieu de carte +-15 px, hors ergot par x>=CSS40) ==")
for nom,ya,yb in [("rang1",560,660),("rang2",960,1060),("rang3",1310,1410),("don-rang",300,440)]:
    bordsX(nom,r,ya,yb,BB_R,0,FR,PX(40,0,FR),1119)
print("-- bords Y (bande x CSS 300..500, hors medaillon/ergot) --")
for nom,ya,yb in [("rang1",480,750),("rang2",885,1150),("rang3",1235,1500),("don-rang",250,495)]:
    bordsY(nom,r,PX(300,0,FR),PX(500,0,FR),BB_R,0,FR,ya,yb)
print("-- controle negatif : bande de fond pur (y 1830..1845) --")
bordsX("fond-pur",r,1830,1845,BB_R,0,FR,PX(40,0,FR),1119)

print("\n== CAPTURE ==")
for nom,ya,yb in [("rang1",745,845),("rang2",1125,1225),("rang3",1503,1603),("don-rang",510,645)]:
    bordsX(nom,c,ya,yb,BB_C,CX0,FC,PX(40,CX0,FC),1065)
print("-- bords Y (bande x CSS 300..500) --")
for nom,ya,yb in [("rang1",675,915),("rang2",1055,1295),("rang3",1433,1673),("don-rang",460,685)]:
    bordsY(nom,c,PX(300,CX0,FC),PX(500,CX0,FC),BB_C,CY0,FC,ya,yb)
print("-- controle negatif : bande de fond pur (y 2050..2070) --")
bordsX("fond-pur",c,2050,2070,BB_C,CX0,FC,PX(40,CX0,FC),1065)
