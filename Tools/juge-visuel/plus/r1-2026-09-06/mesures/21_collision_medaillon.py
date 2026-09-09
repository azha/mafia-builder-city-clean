#!/usr/bin/env python3
"""Collision chrome/contenu : l'arc du medaillon traverse-t-il le libelle de la 1re rangee ?
Instrument : (a) bande y du libelle (encre chaude claire, x 380..700, hors ring) ;
             (b) emprise x de l'anneau or (R-B>60, lum>90) ligne par ligne sur cette bande.
Controle positif : sur une rangee sans chrome (r3), l'emprise de l'anneau doit etre VIDE.
Controle negatif : sur la ligne du liseré de bandeau (y=140), l'emprise doit etre PLEINE largeur."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p=os.path.join(D,'capture-1080x2400.png')
im=Image.open(p).convert('RGB'); W,H=im.size; px=im.load()
print(f"ouvre {os.path.basename(p)} taille={im.size}")
def Lu(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def anneau(c): return (c[0]-c[2])>60 and Lu(c)>90
def emprise(y,x0=380,x1=700):
    xs=[x for x in range(x0,x1) if anneau(px[x,y])]
    return (min(xs),max(xs),len(xs)) if xs else None
print("CONTROLE NEGATIF  y=140 (liseré de bandeau) :", emprise(140,0,1080))
print("CONTROLE POSITIF  r3 y=440 (aucun chrome)   :", emprise(440))
print()
print("bande du libelle 'LA REPUTATION' (y 185..206) — emprise de l'anneau or :")
for y in range(184,210):
    e=emprise(y)
    print(f"   y={y:4d} : {e}")
