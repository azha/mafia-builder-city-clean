#!/usr/bin/env python3
"""Couche globale : luminance moyenne, densite d'encre, contrastes des textes
principaux. Zone libre = 143..2171 (capture) / 143..2102 (maquette).
Controle positif : le contraste du titre de la plaque (encre sombre sur beige)
doit sortir tres proche des deux cotes (memes couleurs, prouvees a 1/255 au 07)."""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def L(c): return 0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2])
def contraste(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
def charge(p,e=1.0):
    im=Image.open(os.path.join(D,p)).convert('RGB'); print(f"  ouvert: {p} {im.size}")
    if e!=1.0: im=im.resize((round(im.width*e),round(im.height*e)),Image.LANCZOS); print(f"    -> {im.size}")
    return im
def med(im,cx,cy,r=6):
    px=im.load(); v=[px[x,y] for x in range(cx-r,cx+r+1) for y in range(cy-r,cy+r+1)]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3))
def globale(im,y0,y1,nom):
    px=im.load(); w,h=im.size; s=0;n=0;enc=0
    for y in range(y0,min(y1,h),2):
        for x in range(0,w,2):
            c=px[x,y]; l=0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; s+=l; n+=1
            if l>12: enc+=1
    print(f"  [{nom}] luminance moyenne de la zone libre = {s/n:.1f}/255 ; "
          f"part 'encre' (L>12) = {100*enc/n:.1f}%")

cap=charge('capture-1080x2400.png'); tem=charge('etats/v4-1.png',1.2); ref=charge('reference-1080x2102.png')
globale(cap,143,2171,'capture'); globale(tem,143,2102,'temoin v4-1'); globale(ref,143,2102,'reference')

print("\n--- contrastes (grands textes >= 3:1, petits >= 4,5:1) ---")
def ctr(nom,fg,bg): print(f"  {nom}: encre={fg} fond={bg} -> {contraste(fg,bg):.2f}:1")
# titre de la plaque : encre la plus sombre trouvee / beige
def encre_med(im,x0,y0,x1,y1,seuil=120):
    px=im.load(); v=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)
                     if 0.2126*px[x,y][0]+0.7152*px[x,y][1]+0.0722*px[x,y][2]<seuil]
    return tuple(sorted(c[i] for c in v)[len(v)//2] for i in range(3)) if v else None
ctr("plaque/titre  CAPTURE", encre_med(cap,139,2029,712,2063), med(cap,700,2060))
ctr("plaque/titre  TEMOIN ", encre_med(tem,141,1713,619,1746), med(tem,700,1740))
ctr("plaque/ss-titre CAPTURE", encre_med(cap,139,2073,329,2094,150), med(cap,700,2060))
ctr("plaque/ss-titre TEMOIN ", encre_med(tem,143,1758,316,1780,150), med(tem,700,1740))
ctr("plaque/compte CAPTURE", encre_med(cap,932,2036,1005,2083,150), med(cap,700,2060))
ctr("plaque/compte REF    ", encre_med(ref,945,1721,1002,1763,150), med(ref,700,1745))
ctr("message vide CAPTURE", (177,165,139), (0,0,0))
ctr("message vide TEMOIN ", (234,194,104), (16,23,35))
ctr("surtitre TEMOIN     ", (156,147,127), (16,23,35))
