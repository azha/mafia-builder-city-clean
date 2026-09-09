# -*- coding: utf-8 -*-
"""11 - Mise en page : colonnes, hauteur des articles, densite, occupation.
CONTROLE POSITIF : dans la REFERENCE, l'ecart entre les deux colonnes doit valoir le gap CSS
de .planche (8 px CSS x3,6 = 28,8 px) a +-3 px.
CONTROLE NEGATIF : la meme sonde sur la CAPTURE ne doit trouver AUCUNE separation verticale
au milieu (une seule colonne)."""
from PIL import Image
import os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
pr=R.load(); pc=C.load()

def colonnes(im,px,y0,y1,seuil):
    """pour chaque x, y a-t-il de l'encre quelque part dans [y0,y1) ?"""
    pres=[]
    for x in range(0,1080):
        pres.append(any(lum(px[x,y])>seuil for y in range(y0,y1,3)))
    segs=[];deb=None
    for x,v in enumerate(pres):
        if v and deb is None: deb=x
        if not v and deb is not None:
            segs.append((deb,x-1)); deb=None
    if deb is not None: segs.append((deb,1079))
    return [s for s in segs if s[1]-s[0]>=4]

print()
print("REF  colonnes de la 1re planche (y 690..1010, seuil 30) :")
for s in colonnes(R,pr,690,1010,30): print("     x=%4d..%4d  (l=%d)"%(s[0],s[1],s[1]-s[0]+1))
print("REF  colonnes de la 2e planche (y 1090..1400, seuil 30) :")
for s in colonnes(R,pr,1090,1400,30): print("     x=%4d..%4d  (l=%d)"%(s[0],s[1],s[1]-s[0]+1))
print()
print("CAP  colonnes de la carte 1 (y 540..880, seuil 20) :")
for s in colonnes(C,pc,540,880,20): print("     x=%4d..%4d  (l=%d)"%(s[0],s[1],s[1]-s[0]+1))
print("CAP  colonnes de la carte 2 (y 920..1315, seuil 20) :")
for s in colonnes(C,pc,920,1315,20): print("     x=%4d..%4d  (l=%d)"%(s[0],s[1],s[1]-s[0]+1))

def lignes(im,px,x0,x1,y0,y1,seuil):
    pres=[]
    for y in range(y0,y1):
        pres.append(any(lum(px[x,y])>seuil for x in range(x0,x1,3)))
    segs=[];deb=None
    for i,v in enumerate(pres):
        if v and deb is None: deb=i+y0
        if not v and deb is not None:
            segs.append((deb,i+y0-1)); deb=None
    if deb is not None: segs.append((deb,y1-1))
    return [s for s in segs if s[1]-s[0]>=4]

print()
print("REF  bandes horizontales dans la colonne 1 (x 40..525, y 590..1830, seuil 30) :")
for s in lignes(R,pr,40,525,590,1830,30): print("     y=%4d..%4d  (h=%3d px = %5.1f CSS)"%(s[0],s[1],s[1]-s[0]+1,(s[1]-s[0]+1)/3.6))
print()
print("CAP  bandes horizontales (x 35..1045, y 200..2170, seuil 18) :")
for s in lignes(C,pc,35,1045,200,2170,18): print("     y=%4d..%4d  (h=%3d px = %5.1f CSS)"%(s[0],s[1],s[1]-s[0]+1,(s[1]-s[0]+1)/3.6))
