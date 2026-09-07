# -*- coding: utf-8 -*-
"""BBOX de la plaque du bloc 'paliers' (fond #16161c) DANS la boite liste (fond #0d0d0d) :
remplace les '~' de l'annexe 2 par des nombres mesures.
CONTROLE POSITIF : le fond de la plaque doit valoir #16161c (22,22,28), le fond alentour #0d0d0d.
CONTROLE NEGATIF : la meme detection appliquee 300 px plus bas (le vide) ne doit rien trouver."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
px=cap.load(); print("image :", cap.size)
def plaque(p): return abs(p[0]-22)<=3 and abs(p[1]-22)<=3 and abs(p[2]-28)<=3
def bbox(y0,y1):
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(50,1030):
            if plaque(px[x,y]): xs.append(x); ys.append(y)
    if not xs: return None
    return min(xs),min(ys),max(xs),max(ys),len(xs)
b=bbox(683,1815)
if b:
    x0,y0,x1,y1,n=b
    print("  plaque du bloc : x=%d..%d (l=%d px = %.1f CSS)  y=%d..%d (h=%d px = %.1f CSS)  %d px apparies"
          % (x0,x1,x1-x0+1,(x1-x0+1)/S,y0,y1,y1-y0+1,(y1-y0+1)/S,n))
    print("  marge dans la boite liste : gauche %d px = %.1f CSS ; haute %d px = %.1f CSS"
          % (x0-50,(x0-50)/S, y0-682,(y0-682)/S))
print("  CONTROLE POSITIF fond plaque (700,760)-(900,860) :", end=" ")
ch=[[],[],[]]
for y in range(760,860):
    for x in range(700,900):
        for i in range(3): ch[i].append(px[x,y][i])
print(tuple(sorted(c)[len(c)//2] for c in ch), " attendu (22,22,28)")
print("  CONTROLE NEGATIF meme detection y=1200..1500 :", bbox(1200,1500))
