#!/usr/bin/env python3
"""Libelles des rangees basses : encre CHAUDE seulement (R-B>20 et lum>95) — le cerclage des
pastilles du dock est neutre/bleute, il sort du masque.
Controle positif : le masque doit retrouver 'LA VENTE' (rangee 3) a la meme largeur qu'au 11 (111 px).
Controle negatif : applique au disque d'une pastille (x 210..300, y 2240..2260), il doit rendre 0 px."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def chaud(c): return Lu(c)>95 and (c[0]-c[2])>20
def bb(x0,x1,y0,y1):
    pts=[(x,y) for y in range(y0,min(y1,H)) for x in range(x0,x1) if chaud(px[x,y])]
    if not pts: return None
    return (min(p[0] for p in pts),min(p[1] for p in pts),max(p[0] for p in pts),max(p[1] for p in pts),len(pts))
print("CONTROLE POSITIF  r3 'LA VENTE' :", bb(0,W,389,497), " (attendu larg 111 px)")
print("CONTROLE NEGATIF  disque de pastille x210..300 y2240..2260 :", bb(210,300,2240,2260))
print()
for a,b,nom in [(2106,2214,'r17 LA DISTRIBUTION'),(2228,2336,'r18 LA LOI'),(2351,2400,'r19 ?')]:
    r=bb(0,W,a,b)
    if r:
        x0,y0,x1,y1,n=r
        print(f"  {nom:22s} encre x {x0}..{x1} (larg {x1-x0+1}) y {y0}..{y1} (h {y1-y0+1}) centre_x={(x0+x1)/2:.1f} n={n}")
    else:
        print(f"  {nom:22s} AUCUNE encre chaude")
print()
print("[bas de l'ecran] derniere ligne de l'image y=2399 : y'a-t-il du contenu de rangee ?")
print("   px(20,2399)=",px[20,2399],"  px(540,2399)=",px[540,2399])
print("   la rangee 19 (attendue y 2351..2459 au pas de 123) est coupee a y=2399 :",
      f"{2400-2351} px visibles sur 109 = {100*(2400-2351)/109:.0f} %")
