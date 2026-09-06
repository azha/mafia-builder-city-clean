#!/usr/bin/env python3
"""REFERENCE : bandeau, bureau (bois), plaque de titre doree, panneau acajou (cadre + interieur),
lampe verte, medaillons d'icone, badges dores. Mesures par masques de couleur, bornes lues.
Controles : (+) largeur=1080 ; (-) le masque 'or' ne doit pas attraper le creme des cartes."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'reference-1080x2102.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

# 1. bandeau noir du haut : premiere ligne ou la mediane cesse d'etre quasi noire
import statistics
def medl(y, x0=0,x1=W):
    v=sorted(L(px[x,y]) for x in range(x0,x1,3)); return v[len(v)//2]
print("\n[1] bandeau haut (mediane de luminance par ligne, x complet)")
for y in range(230,290,2):
    print(f"   y={y} medlum={medl(y):6.1f}  px(30,y)={px[30,y]}")

# 2. plaque de titre doree : masque or (R>150, R-B>60)
def orr(c): return c[0]>140 and c[0]-c[2]>55
ys=[y for y in range(280,430) if sum(1 for x in range(0,W,3) if orr(px[x,y]))>60]
print(f"\n[2] plaque de titre : y {min(ys)}..{max(ys)} h={max(ys)-min(ys)+1}")
ym=(min(ys)+max(ys))//2
xs=[x for x in range(W) if orr(px[x,ym])]
print(f"    a mi-hauteur y={ym} : x {min(xs)}..{max(xs)} larg={max(xs)-min(xs)+1} ; fill centre={px[540,ym]}")
print("    CONTROLE NEGATIF : creme de carte (540,610) capte par masque 'or' ?", orr(px[540,610]))

# 3. lampe verte
def vert(c): return c[1]>c[0]+25 and c[1]>c[2]+25 and c[1]>60
pts=[(x,y) for y in range(100,260,2) for x in range(600,1010,2) if vert(px[x,y])]
if pts:
    print(f"\n[3] lampe verte : x {min(p[0] for p in pts)}..{max(p[0] for p in pts)}  y {min(p[1] for p in pts)}..{max(p[1] for p in pts)} ; couleur={px[840,160]}")

# 4. panneau acajou : bord rouge sombre du cadre
print("\n[4] panneau (bord) : balayage horizontal a y=1200")
prev=None
for x in range(0,140):
    c=px[x,1200]
    if prev is None or (abs(c[0]-prev[0])+abs(c[1]-prev[1])+abs(c[2]-prev[2]))>12:
        print(f"    x={x:4d} {c}")
    prev=c
