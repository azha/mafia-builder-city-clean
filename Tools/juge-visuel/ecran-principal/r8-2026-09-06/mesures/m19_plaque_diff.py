# -*- coding: utf-8 -*-
"""m19 - la plaque de fiche par DIFFERENCE : capture-fiche-1080x2400 moins
capture-district-1080x2400 (meme commit, meme etat). Tout pixel qui differe appartient a la
plaque ; le reste doit etre BIT-IDENTIQUE -- c'est a la fois la mesure et son controle.
Donne : boite exacte, rayon de coin, et la transmittance de la plaque (le fond se lit a travers)."""
import sys, math; sys.path.insert(0,'.')
from commun import *
A,f=ouvrir('j2400'); B,_=ouvrir('d2400')
pa=A.load(); pb=B.load(); W,H=A.size
diff=[]
lignes={}
for y in range(H):
    xs=[]
    for x in range(W):
        if pa[x,y]!=pb[x,y]: xs.append(x)
    if xs: lignes[y]=(xs[0],xs[-1],len(xs))
ys=sorted(lignes)
print("=== m19 : plaque par difference (2400) ===")
print("   lignes qui different : %d (y %d..%d)"%(len(ys),ys[0],ys[-1]))
x0=min(l[0] for l in lignes.values()); x1=max(l[1] for l in lignes.values())
print("   boite de la plaque : x %d..%d px = %.2f..%.2f CSS (largeur %.2f) ; y %d..%d px = %.2f..%.2f CSS (hauteur %.2f)"
      %(x0,x1,x0/f,x1/f,(x1-x0+1)/f, ys[0],ys[-1],ys[0]/f,ys[-1]/f,(ys[-1]-ys[0]+1)/f))
print("   [CONTROLE] pixels differents HORS de cette boite : %d"
      %sum(1 for y in ys for xx in (lignes[y][0],lignes[y][1]) if not (x0<=xx<=x1)))
# lignes pleines vs lignes rognees -> rayon de coin
print("   retrait du bord GAUCHE, 16 premieres et 16 dernieres lignes (CSS) :")
h=[(lignes[y][0]-x0)/f for y in ys[:16]]
b=[(lignes[y][0]-x0)/f for y in ys[-16:]]
print("      haut : %s"%(" ".join("%.2f"%v for v in h)))
print("      bas  : %s"%(" ".join("%.2f"%v for v in b)))
# transmittance : correlation entre le fond nu et le fond vu a travers la plaque
import random
random.seed(7)
ech=[]
for y in range(ys[0]+30, ys[-1]-30):
    for x in range(x0+30, x1-30, 7):
        cb=pb[x,y]; ca=pa[x,y]
        if max(cb)-min(cb)<200: ech.append((cb,ca))
ech=[e for e in ech if e[0][1]>60]     # fond clair seulement (art), pour un levier utile
def pente(k):
    n=len(ech); sx=sum(e[0][k] for e in ech); sy=sum(e[1][k] for e in ech)
    sxx=sum(e[0][k]**2 for e in ech); sxy=sum(e[0][k]*e[1][k] for e in ech)
    return (n*sxy-sx*sy)/float(n*sxx-sx*sx)
print("   transmittance de la plaque (pente d(px vu)/d(px nu)) : R %.3f  G %.3f  B %.3f   sur %d echantillons"
      %(pente(0),pente(1),pente(2),len(ech)))
print("   canon : background linear-gradient(180deg,#0c1320ef,#080d17f6) => 1-alpha = 0.063 -> 0.035")
