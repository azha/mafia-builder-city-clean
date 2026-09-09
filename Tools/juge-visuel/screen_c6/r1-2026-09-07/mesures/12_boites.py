# -*- coding: utf-8 -*-
"""Geometrie des BOITES : bords horizontaux (OR separe du ROUGE) + bords verticaux,
puis couleur MEDIANE du remplissage (fenetre a >=6 px de tout bord) et couleur du BORD.
CONTROLE POSITIF : sur la reference, le bord bas de l'enseigne doit etre ~#b08d3e (176,141,62) a +-12/canal.
CONTROLE NEGATIF : le fond de l'elast de la reference (#0d0f10) doit DIFFERER du fond du .pann (#111823)."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)

def isor(p):   # or/laiton : chaud, pas rouge pur
    r,g,b=p
    return r>g>b and r>=90 and (r-b)>=35 and (g-b)>=12
def isrouge(p):
    r,g,b=p
    return r>=140 and (r-g)>=60 and (g-b)<12

def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)

def cols(im,y0,y1,pred,seuil=0.5):
    px=im.load(); w,h=im.size; out=[]
    for x in range(w):
        n=sum(1 for y in range(y0,y1,2) if pred(px[x,y]))
        out.append(n/len(range(y0,y1,2)))
    bandes=[];cur=None
    for x,v in enumerate(out):
        if v>=seuil:
            if cur is None: cur=[x,x,v]
            else: cur[1]=x; cur[2]=max(cur[2],v)
        else:
            if cur: bandes.append(tuple(cur)); cur=None
    if cur: bandes.append(tuple(cur))
    return bandes

def rows(im,x0,x1,pred,seuil=0.35):
    px=im.load(); w,h=im.size; out=[]
    for y in range(h):
        n=sum(1 for x in range(x0,x1,2) if pred(px[x,y]))
        out.append(n/len(range(x0,x1,2)))
    bandes=[];cur=None
    for y,v in enumerate(out):
        if v>=seuil:
            if cur is None: cur=[y,y,v]
            else: cur[1]=y; cur[2]=max(cur[2],v)
        else:
            if cur: bandes.append(tuple(cur)); cur=None
    if cur: bandes.append(tuple(cur))
    return bandes

for f in ("reference-1080x2102.png","capture-ecran-seul-etat-vide-1080x2400.png",
          "capture-1080x2400.png","capture-ecran-seul-1080x2400.png","capture-ecran-seul-1080x1920.png"):
    im=Image.open(os.path.join(R,f)).convert("RGB"); w,h=im.size
    print("\n### %s  %dx%d" % (f,w,h))
    print("  lignes OR (laiton, hors rouge) :", [(a,b,b-a+1) for a,b,m in rows(im,0,w,isor)])
    print("  lignes ROUGE                   :", [(a,b,b-a+1) for a,b,m in rows(im,0,w,isrouge)])
print()
im=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
print("CONTROLE POSITIF bord bas enseigne REF y=641..645 x=200..800 :", med(im,200,641,800,646), " attendu ~ (176,141,62) #b08d3e")
print("CONTROLE NEGATIF fond .elast REF (y=1750..1790,x=250..700) :", med(im,250,1750,700,1790), " vs fond .pann/.ct :", med(im,250,1120,700,1160))
