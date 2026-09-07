# -*- coding: utf-8 -*-
"""Profils de lignes/colonnes : frontieres horizontales majeures des deux images.
Controle positif : la largeur des deux images DOIT etre 1080 (meme largeur d'ecran).
Controle negatif : les hauteurs DOIVENT differer (2102 vs 2400)."""
from PIL import Image
import statistics as st

REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"

def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def profil(path, x0=0, x1=1080):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s  taille=%dx%d" % (path, W, H))
    px=im.load()
    rows=[]
    for y in range(H):
        vals=[lum(px[x,y]) for x in range(x0,x1,4)]
        rows.append(sum(vals)/len(vals))
    return im,W,H,rows

def frontieres(rows, seuil=6.0):
    out=[]
    for y in range(1,len(rows)):
        d=rows[y]-rows[y-1]
        if abs(d)>=seuil: out.append((y, round(rows[y-1],1), round(rows[y],1), round(d,1)))
    return out

for path in (REF,CAP):
    im,W,H,rows=profil(path)
    print("  --- frontieres de luminance (|delta| >= 6) ---")
    for f in frontieres(rows):
        print("   y=%4d  %6.1f -> %6.1f  (d=%+6.1f)" % f)
    print()

# CONTROLES
a=Image.open(REF); b=Image.open(CAP)
print("CONTROLE POSITIF  largeurs egales :", a.size[0], b.size[0], "->", a.size[0]==b.size[0])
print("CONTROLE NEGATIF  hauteurs differentes :", a.size[1], b.size[1], "->", a.size[1]!=b.size[1])
