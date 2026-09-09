#!/usr/bin/env python3
"""Detail de la plaque : hauteur PERPENDICULAIRE (a x fixe), inclinaison du bord
haut, pastille (bbox + couleur + anneau), hauteurs de capitale des 3 textes.
Controle positif : la couleur beige (mesuree au 07) est deja prouvee egale a 1/255.
Controle negatif : l'inclinaison mesuree cote CAPTURE doit sortir NULLE (bords
horizontaux) — si l'instrument rendait une inclinaison des deux cotes il ne
mesurerait pas l'inclinaison."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def hauteur_a_x(im,x,y0,y1,s=110):
    px=im.load(); ys=[y for y in range(y0,y1) if lum(px[x,y])>=s]
    return (ys[0],ys[-1],ys[-1]-ys[0]+1) if ys else None
def bord_haut(im,y0,y1,s=110):
    px=im.load(); out=[]
    for x in range(100,1000,100):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>=s]
        out.append((x, ys[0] if ys else None))
    return out

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2)

print("\n--- hauteur perpendiculaire du remplissage beige (a x fixe) ---")
for x in [200,400,600,800,950]:
    print(f"  x={x}  capture={hauteur_a_x(cap,x,1980,2145)}   temoin={hauteur_a_x(tem,x,1650,1840)}")

print("\n--- bord HAUT du beige, par x (revele l'inclinaison) ---")
print(f"  capture : {bord_haut(cap,1980,2145)}")
print(f"  temoin  : {bord_haut(tem,1650,1840)}")

print("\n--- pastille verte : bbox + couleur ---")
def pastille(im,y0,y1,x0,x1):
    px=im.load(); xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=px[x,y]
            if g>r+15 and g>b+15 and g>40: xs.append(x);ys.append(y);cols.append((r,g,b))
    if not xs: return None
    c=tuple(sorted(k[i] for k in cols)[len(cols)//2] for i in range(3))
    return (min(xs),min(ys),max(xs),max(ys),max(xs)-min(xs)+1,max(ys)-min(ys)+1,c,len(xs))
print(f"  capture : {pastille(cap,1990,2135,40,220)}")
print(f"  temoin  : {pastille(tem,1655,1830,40,220)}")

print("\n--- textes de la plaque : segments d'encre SOMBRE sur le beige ---")
def segments_texte(im,y0,y1,x0,x1,s=150):
    px=im.load(); out=[];deb=None
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])<s)
        if n>2 and deb is None: deb=y
        elif n<=2 and deb is not None: out.append((deb,y-1,y-deb)); deb=None
    if deb is not None: out.append((deb,y1-1,y1-deb))
    return out
print(f"  capture titre+ss-titre (x 130..760) : {segments_texte(cap,1995,2128,130,760)}")
print(f"  temoin  titre+ss-titre (x 140..760) : {segments_texte(tem,1668,1824,140,760)}")
print(f"  capture compte (x 900..1030) : {segments_texte(cap,1995,2128,900,1030)}")
print(f"  temoin  compte (x 940..1030) : {segments_texte(tem,1668,1824,940,1030)}")
