# -*- coding: utf-8 -*-
"""Le bloc 'L'ECHELLE DES PALIERS' de la capture : lignes, indentation, et l'ESPACE avant le chiffre
('Palier 2' contre 'Palier3'). Mesure = ecart en px entre la fin du 'r' et le debut du chiffre.
CONTROLE POSITIF : sur la ligne 'Palier 2' l'ecart doit etre NETTEMENT plus grand que sur 'Palier3'.
CONTROLE NEGATIF : l'ecart entre deux lettres INTERNES du mot 'Palier' (entre 'l' et 'i') doit etre petit
   et comparable sur les quatre lignes — sinon la sonde mesure autre chose que l'espace."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
px=cap.load(); print("image :", cap.size)
# lignes d'encre dans la boite liste
x0,x1=70,1015
seuil=None
fond=[]
for y in range(690,1080):
    for x in range(x0,x1,7): fond.append(lum(px[x,y]))
fond.sort(); f=fond[len(fond)//4]; seuil=f+22
print("fond_lum(q1)=%.1f  seuil=%.1f"%(f,seuil))
lignes=[];cur=None
for y in range(690,1090):
    n=sum(1 for x in range(x0,x1) if lum(px[x,y])>=seuil)
    if n>0:
        if cur is None: cur=[y,y]
        else: cur[1]=y
    else:
        if cur: lignes.append(tuple(cur)); cur=None
if cur: lignes.append(tuple(cur))
print("\nlignes d'encre detectees dans la boite liste :")
for i,(a,b) in enumerate(lignes):
    xs=[x for x in range(x0,x1) if any(lum(px[x,y])>=seuil for y in range(a,b+1))]
    # clusters
    seg=[];c=None
    for x in xs:
        if c is None: c=[x,x]
        elif x-c[1]<=4: c[1]=x
        else: seg.append(tuple(c)); c=[x,x]
    if c: seg.append(tuple(c))
    print("  L%d y=%4d..%4d h=%3d px=%.2f CSS  x=%4d..%4d  indent=%3d px=%.1f CSS  %d mots"
          % (i+1,a,b,b-a+1,(b-a+1)/S,xs[0],xs[-1],xs[0]-70,(xs[0]-70)/S,len(seg)))
    print("        mots (x0,x1,largeur) :", [(u,v,v-u+1) for u,v in seg][:9])
