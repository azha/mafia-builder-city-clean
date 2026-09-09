# -*- coding: utf-8 -*-
"""Fond de chaque ligne = MEDIANE des pixels de la ligne (robuste au texte).
Sert a trouver : bandeau, entete, bandeau .bas, dock, et la couleur d'aplat de chaque zone.
Controle positif : la mediane de la ligne y=800 de la REFERENCE (plein papier) doit valoir #efe7d6 +-6.
Controle negatif : la mediane d'une ligne du fond (y=1400 ref) doit en etre tres loin."""
from PIL import Image
def med(vals):
    vals=sorted(vals); n=len(vals); return vals[n//2]
def ligne_med(px,W,y,step=3):
    R=[];G=[];B=[]
    for x in range(0,W,step):
        p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
def go(path, ys=None):
    im=Image.open(path).convert("RGB"); W,H=im.size
    print("OUVERT %s  taille=%dx%d"%(path,W,H)); px=im.load()
    prev=None; changes=[]
    meds=[ligne_med(px,W,y) for y in range(H)]
    for y in range(1,H):
        a,b=meds[y-1],meds[y]
        d=max(abs(a[i]-b[i]) for i in range(3))
        if d>=4: changes.append((y,a,b,d))
    print("  changements de MEDIANE de ligne (>=4/255 sur un canal) :")
    for y,a,b,d in changes: print("   y=%4d  %s -> %s  (d=%d)"%(y,a,b,d))
    if ys:
        print("  medianes demandees :")
        for y in ys: print("   y=%4d  %s  #%02x%02x%02x"%(y,meds[y],meds[y][0],meds[y][1],meds[y][2]))
    return meds
mr=go("../reference-1080x2102.png", ys=[200,500,800,1300,1500,1700,1850,1900,2000,2080])
print()
mc=go("../capture-1080x2400.png", ys=[80,200,300,700,1200,1300,1600,1900,2200,2300,2380])
print()
print("CONTROLE POSITIF ref y=800 (plein papier) :",mr[800],"attendu ~ (239,231,214) #efe7d6")
print("CONTROLE NEGATIF ref y=1400 (fond) :",mr[1400])
