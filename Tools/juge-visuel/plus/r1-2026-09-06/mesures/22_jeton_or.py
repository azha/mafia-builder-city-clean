#!/usr/bin/env python3
"""Ou vit le jeton OR (176,141,61) dans la zone de contenu de la capture ?
Instrument : proximite par canal (|d|<18) au jeton, puis regroupement en bandes de y.
Controle positif : la bande de l'anneau du manometre (chrome) DOIT sortir — sinon le seuil est trop serre.
Controle negatif : la meme sonde sur une rangee du milieu (y 634..742) doit rendre 0 px."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def prox(c,t=(176,141,61),d=18):
    return abs(c[0]-t[0])<d and abs(c[1]-t[1])<d and abs(c[2]-t[2])<d
print("CONTROLE NEGATIF rangee 5 (y 634..742) :",
      sum(1 for y in range(634,742) for x in range(W) if prox(px[x,y])), "px (attendu 0)")
pts=[(x,y) for y in range(144,H) for x in range(W) if prox(px[x,y])]
print(f"total dans la zone de contenu (y>=144) : {len(pts)} px")
ys=sorted(set(q[1] for q in pts)); bandes=[]; cur=[ys[0]]
for y in ys[1:]:
    if y-cur[-1]>5: bandes.append((cur[0],cur[-1])); cur=[]
    cur.append(y)
bandes.append((cur[0],cur[-1]))
NOMS={0:'anneau du manometre (CHROME)',1:'losange de la rangee 1',2:"trait d'onglet actif (dock)"}
for i,(a,b) in enumerate(bandes):
    xs=[q[0] for q in pts if a<=q[1]<=b]
    print(f"  bande y {a}..{b}  x {min(xs)}..{max(xs)}  n={len(xs)}   {NOMS.get(i,'?')}")
print("CONTROLE POSITIF l'anneau du manometre est bien la premiere bande :", bandes[0][0] < 210)
