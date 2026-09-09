# -*- coding: utf-8 -*-
"""Hauteur de CAPITALE mesuree sur la 1re lettre (un C ou un P majuscule, sans accent ni jambage).
CONTROLE POSITIF : sur la REFERENCE, h3 est declare 12px CSS DejaVu Serif -> cap = 0,729*12 = 8,75 CSS
                   = 31,5 px a x3,6. La mesure doit tomber a +-2 px.
CONTROLE NEGATIF : la meme sonde sur une zone VIDE doit rendre 'aucune encre'."""
from PIL import Image
def cap(path, xa,xb, ya,yb, fond, seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load()
    ys=[]
    for y in range(ya,yb+1):
        for x in range(xa,xb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: ys.append(y); break
    if not ys: return None
    return min(ys),max(ys),max(ys)-min(ys)+1

CASES=[
 ("REF titre h3   'C' de Commander", "../reference-1080x2102.png", 51, 86, 460,530, (30,27,22)),
 ("CAP titre      'C' de Commander", "../capture-1080x2400.png",   60,110, 270,360, (13,13,13)),
 ("REF sous-titre 'S' de Sans",      "../reference-1080x2102.png", 51, 70, 535,575, (30,27,22)),
 ("CAP sous-titre 'S' de Sans",      "../capture-1080x2400.png",   60, 85, 470,525, (13,13,13)),
 ("REF bon h4     'P' de Pyralin",   "../reference-1080x2102.png", 91,116, 675,725, (239,231,214)),
 ("CAP bon h4     'P' de Pyralin",   "../capture-1080x2400.png",  105,140, 640,715, (234,224,200)),
 ("REF label      'A' de A QUOI",    "../reference-1080x2102.png", 90,112, 765,805, (239,231,214)),
 ("CAP label      'A' de A QUOI",    "../capture-1080x2400.png",  101,128, 730,780, (234,224,200)),
 ("REF CTA        'E' de EN COMM.",  "../reference-1080x2102.png", 90,112,1960,2030, (36,28,17)),
 ("CAP CTA        'E' de EN COMM.",  "../capture-1080x2400.png",  110,140,1400,1490, (217,171,77)),
 ("REF bon span   'B' de BON DE",    "../reference-1080x2102.png",700,722, 680,720, (239,231,214)),
 ("CAP bon span   'B' de BON DE",    "../capture-1080x2400.png",  660,690, 640,700, (234,224,200)),
]
im=Image.open("../reference-1080x2102.png"); print("OUVERT reference taille",im.size)
im2=Image.open("../capture-1080x2400.png"); print("OUVERT capture   taille",im2.size)
res={}
for nom,path,xa,xb,ya,yb,fond in CASES:
    r=cap(path,xa,xb,ya,yb,fond)
    res[nom]=r
    if r: print("  %-34s y=%4d..%4d  CAP = %3d px = %5.2f CSS"%(nom,r[0],r[1],r[2],r[2]/3.6))
    else: print("  %-34s AUCUNE ENCRE"%nom)
print()
print("CONTROLE POSITIF : REF titre attendu 31,5 px (12 CSS DejaVu Serif, ratio cap 0,729)")
print("CONTROLE NEGATIF (ref x300..340 y1300..1380, zone vide) :", cap("../reference-1080x2102.png",300,340,1300,1380,(21,19,17)) or "aucune encre")
