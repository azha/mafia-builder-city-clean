# -*- coding: utf-8 -*-
"""01 - Profils de lignes : trouve les grandes frontieres horizontales (bandeau, dock, panneau).
Controle positif : la largeur de chaque image doit valoir 1080 (ref) / 1080 (captures).
Controle negatif : la ligne 0 de la capture (bandeau) et une ligne du milieu doivent differer."""
from PIL import Image
import os, statistics

def ouvrir(p):
    im = Image.open(p).convert('RGB')
    print("  ouvert %-34s %s" % (os.path.basename(p), im.size))
    return im

def profil(im, x0=None, x1=None):
    """luminance moyenne par ligne + ecart-type horizontal (encre)"""
    w,h = im.size
    x0 = 0 if x0 is None else x0
    x1 = w if x1 is None else x1
    px = im.load()
    out=[]
    for y in range(h):
        s=0; vals=[]
        for x in range(x0,x1,4):
            r,g,b = px[x,y]
            L = 0.2126*r+0.7152*g+0.0722*b
            vals.append(L)
        out.append((sum(vals)/len(vals), statistics.pstdev(vals)))
    return out

def frontieres(prof, seuil=6.0):
    """lignes ou la luminance moyenne saute de plus de `seuil`"""
    res=[]
    for y in range(1,len(prof)):
        d = prof[y][0]-prof[y-1][0]
        if abs(d) >= seuil:
            res.append((y, round(prof[y-1][0],1), round(prof[y][0],1), round(d,1)))
    return res

print("=== 01 bandes ===")
for nom in ['../reference-㉓-1080x2102.png','../capture-1080x2400.png','../capture-planche-1080x2400.png']:
    im = ouvrir(nom)
    p = profil(im)
    print("  frontieres (saut de luminance >= 6) :")
    for f in frontieres(p):
        print("    y=%4d  %6.1f -> %6.1f  (%+.1f)" % f)
    print("  L moyenne image = %.2f" % (sum(v[0] for v in p)/len(p)))
    print()

# controle positif / negatif
im = ouvrir('../capture-1080x2400.png')
p = profil(im)
print("CONTROLE POSITIF  largeur=1080 :", im.size[0]==1080)
print("CONTROLE NEGATIF  L(y=20) vs L(y=1200) :", round(p[20][0],2), round(p[1200][0],2), "-> different :", abs(p[20][0]-p[1200][0])>1)
