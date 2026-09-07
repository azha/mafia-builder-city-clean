# -*- coding: utf-8 -*-
"""INVENTAIRE EXHAUSTIF de l'encre de la capture etat-vide : toute ligne contenant au moins un pixel
au-dessus du seuil, sur TOUTE la surface. Sert a fonder les enonces d'ABSENCE
('la phrase X n'est pas sur l'ecran') : on ne conclut a l'absence qu'apres avoir transcrit TOUT ce qui
est present. CONTROLE POSITIF : les 5 lignes du bloc 'paliers' et les 4 lignes du pave DOIVENT y etre.
CONTROLE NEGATIF : la zone y=1070..1815 (le vide) ne doit produire AUCUNE ligne."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
px=cap.load(); w,h=cap.size
print("image :", cap.size)
# on exclut les 6 px de chaque bord de boite (les traits or) en travaillant a x=56..1024
# et en ignorant les lignes ou l'encre s'etale sur >700 colonnes (= un trait horizontal)
out=[];cur=None
for y in range(0,h):
    n=sum(1 for x in range(56,1024) if lum(px[x,y])>=60)
    trait = n>700
    if n>0 and not trait:
        if cur is None: cur=[y,y,n]
        else: cur[1]=y; cur[2]=max(cur[2],n)
    else:
        if cur: out.append(tuple(cur)); cur=None
if cur: out.append(tuple(cur))
print("lignes d'encre (hors traits pleins) :", len(out))
for a,b,n in out:
    xs=[x for x in range(56,1024) if any(lum(px[x,y])>=60 for y in range(a,b+1))]
    print("   y=%4d..%4d h=%3d (%5.2f CSS)  x=%4d..%4d  nmax=%4d" % (a,b,b-a+1,(b-a+1)/S,xs[0],xs[-1],n))
vide=[t for t in out if 1070<=t[0]<=1815]
print("CONTROLE NEGATIF lignes dans le vide y=1070..1815 :", len(vide), "(attendu 0)")
print("CONTROLE POSITIF lignes dans la boite liste y=690..1070 :", len([t for t in out if 690<=t[0]<=1070]), "(attendu 5 ou 6 : titre + 4 items + 1 sous-ligne)")
print("CONTROLE POSITIF lignes dans le pave y=1860..2100 :", len([t for t in out if 1860<=t[0]<=2100]), "(attendu 4 : exergue + titre + 2 lignes de texte)")
