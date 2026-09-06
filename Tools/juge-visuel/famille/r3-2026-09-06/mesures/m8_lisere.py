# m8 — largeur et position des cartes par le LISERE INTERNE HAUT (inset 0 1px rgba(255,255,255,.15))
# qui court sur toute la largeur de la carte. On prend la ligne la plus claire de la fenetre, puis
# ses bornes x. Controle positif : largeur CSS calculee du rang = 489,07. Controle negatif : le
# don-rang n'a PAS ce lisere (pas de box-shadow inset dans .don-rang) -> il doit echouer.
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

def ligne_claire(px,y0,y1,x0,x1):
    best=None
    for y in range(y0,y1+1):
        m=sum(lum(px[x,y]) for x in range(x0,x1))/float(x1-x0)
        if best is None or m>best[1]: best=(y,m)
    return best

def bornes_ligne(px,y,x0,x1,seuil):
    xs=[x for x in range(x0,x1) if lum(px[x,y])>seuil]
    if not xs: return None
    return min(xs),max(xs)

def do(nom,px,ytop,orig_x,orig_y,f,xa,xb,fondlum):
    y,m=ligne_claire(px,ytop-8,ytop+14,xa,xb)
    b=bornes_ligne(px,y,xa,xb,fondlum+8)
    col=px[(b[0]+b[1])//2,y] if b else None
    if b:
        print("  %-14s lisere y=%d (CSS %.2f) x %d..%d CSS %.2f..%.2f larg %.2f  coul %s"%(
            nom,y,(y-orig_y)/f,b[0],b[1],(b[0]-orig_x)/f,(b[1]-orig_x)/f,(b[1]-b[0]+1)/f,col))
    else:
        print("  %-14s aucun lisere detecte (ligne la plus claire y=%d moy %.1f)"%(nom,y,m))

LR=lum((22,25,27)); LC=lum((22,22,28))
print("\n== REFERENCE ==")
do("rang1",r,505,0,0,FR,90,1100,LR)
do("rang2",r,909,0,0,FR,90,1100,LR)
do("rang3",r,1259,0,0,FR,90,1100,LR)
do("don-rang(neg)",r,270,0,0,FR,40,1090,LR)
print("\n== CAPTURE ==")
do("rang1",c,695,CX0,CY0,FC,85,1060,LC)
do("rang2",c,1074,CX0,CY0,FC,85,1060,LC)
do("rang3",c,1452,CX0,CY0,FC,85,1060,LC)
do("don-rang(neg)",c,483,CX0,CY0,FC,45,1050,LC)
