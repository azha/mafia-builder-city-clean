#!/usr/bin/env python3
"""Inventaire geometrique de la REFERENCE : cartes creme, plaque de titre, panneau.
Instrument : masque "creme" (R>170 et R>B+25) ; segments verticaux pleine largeur de carte.
Controles : (+) la largeur de l'image = 1080 ; (-) le fond acajou NE doit PAS entrer dans le masque creme."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'reference-1080x2102.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def creme(c): return c[0]>170 and c[0]>c[2]+25
print("CONTROLE NEGATIF fond acajou (x=30,y=1200) =",px[30,1200],"creme?",creme(px[30,1200]))
print("CONTROLE POSITIF carte (x=540,y=610) =",px[540,610],"creme?",creme(px[540,610]))
rows=[]
for y in range(H):
    n=sum(1 for x in range(0,W,4) if creme(px[x,y]))
    rows.append(n*4)
segs=[];cur=None
for y in range(H):
    on = rows[y] > 500     # >500 px de creme sur la ligne = on est dans une carte
    if on and cur is None: cur=y
    if not on and cur is not None:
        if y-cur>=8: segs.append((cur,y-1))
        cur=None
if cur is not None: segs.append((cur,H-1))
print(f"\nbandes 'creme large' (>500 px/ligne) : {len(segs)}")
for a,b in segs:
    # bornes horizontales au milieu de la bande
    ym=(a+b)//2
    xs=[x for x in range(W) if creme(px[x,ym])]
    print(f"  y {a:5d}..{b:5d}  h={b-a+1:4d}  x {min(xs):4d}..{max(xs):4d}  larg={max(xs)-min(xs)+1:4d}  fill(centre)={px[(min(xs)+max(xs))//2, ym]}")
