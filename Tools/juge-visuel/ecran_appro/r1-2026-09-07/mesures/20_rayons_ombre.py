# -*- coding: utf-8 -*-
"""RAYON D'ARRONDI (par le retrait du bord sur les N premieres lignes du coin haut-gauche)
et OMBRE PORTEE du bon (profil de luminance sous le bord bas).
CONTROLE POSITIF : la reference declare .bon{border-radius:2px} = 7,2 px et .geste{border-radius:3px} = 10,8 px
                   -> la sonde doit rendre ces ordres de grandeur.
CONTROLE NEGATIF : sur un bord parfaitement droit (milieu du bord gauche), le retrait doit valoir 0."""
from PIL import Image
def bord_gauche(px,W,y,pred):
    for x in range(0,W):
        if pred(px[x,y]): return x
    return None
def rayon(path,ytop,pred,n=24):
    im=Image.open(path).convert("RGB"); W,H=im.size; px=im.load()
    xs=[bord_gauche(px,W,ytop+k,pred) for k in range(n)]
    xs=[v for v in xs if v is not None]
    if not xs: return None
    return max(xs)-min(xs), xs[:8]
PAPR=lambda p:p[0]>170 and p[1]>160 and p[2]>135
PAPC=lambda p:p[0]>170 and p[1]>160 and p[2]>135
ORC =lambda p:p[0]>150 and p[1]>110 and p[2]<140 and p[0]-p[2]>60
BRDR=lambda p:p[0]>60 and p[1]>50 and p[2]>25 and p[0]-p[2]>25
print("OUVERT reference",Image.open("../reference-1080x2102.png").size)
print("OUVERT capture  ",Image.open("../capture-1080x2400.png").size)
print("  REF bon   coin haut-gauche y=643.. : retrait=%s px  (CSS 2px = 7,2 px)"%str(rayon("../reference-1080x2102.png",643,PAPR)))
print("  CAP bon   coin haut-gauche y=608.. : retrait=%s px"%str(rayon("../capture-1080x2400.png",608,PAPC)))
print("  REF CTA   coin haut-gauche y=1938..: retrait=%s px (CSS 3px = 10,8 px)"%str(rayon("../reference-1080x2102.png",1938,BRDR)))
print("  CAP CTA   coin haut-gauche y=1375..: retrait=%s px"%str(rayon("../capture-1080x2400.png",1375,ORC)))
print("  CONTROLE NEGATIF (bord droit, ref bon y=800..824) : retrait=%s px"%str(rayon("../reference-1080x2102.png",800,PAPR)))
print()
print("--- OMBRE PORTEE sous le bon (CSS ref : box-shadow 0 3px 10px #00000055) ---")
def profil(path,x0,x1,y0,y1):
    im=Image.open(path).convert("RGB"); px=im.load()
    out=[]
    for y in range(y0,y1+1):
        v=sorted(sum(px[x,y])/3 for x in range(x0,x1))
        out.append((y,round(v[len(v)//2],1)))
    return out
print("  REF sous le bon (y1227..1250, x300..800) :",profil("../reference-1080x2102.png",300,800,1227,1248))
print("  CAP sous le bon (y1055..1078, x300..800) :",profil("../capture-1080x2400.png",300,800,1055,1076))
print("  REF au-dessus du bon (y620..642) :",profil("../reference-1080x2102.png",300,800,620,641))
print("  CAP au-dessus du bon (y585..607) :",profil("../capture-1080x2400.png",300,800,585,606))
