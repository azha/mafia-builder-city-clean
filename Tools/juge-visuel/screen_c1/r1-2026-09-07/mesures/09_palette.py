#!/usr/bin/env python3
"""Couche globale : palette dominante (quantifiee 32 niveaux/canal), luminance
moyenne, densite d'encre (part de l'aire dont L>45), et teinte du fond dominant.
On mesure la ZONE DE CONTENU de chaque image (hors chrome), bornes citees.
Controle positif : la somme des parts doit valoir ~100 %.
Controle negatif : recompter sur une sous-bande doit changer les parts."""
from PIL import Image
import os
from collections import Counter
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

ZONES=[('reference-1080x2102.png','contenu .jrn6',18,1062,434,2097),
       ('capture-1080x2400.png','contenu (sous bandeau, sur dock)',18,1062,150,2160),
       ('capture-ecran-seul-1080x2400.png','contenu',18,1062,150,2160)]

for f,nom,x0,x1,y0,y1 in ZONES:
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size; px=im.load()
    print(f"=== {f}  taille={W}x{H}  zone={nom} x{x0}..{x1} y{y0}..{y1} ===")
    c=Counter(); tot=0; sl=0; encre=0; sr=sg=sb=0
    for y in range(y0,y1,2):
        for x in range(x0,x1,2):
            p=px[x,y]; tot+=1; L=lum(p); sl+=L
            if L>45: encre+=1
            sr+=p[0]; sg+=p[1]; sb+=p[2]
            c[(p[0]//16*16,p[1]//16*16,p[2]//16*16)]+=1
    print(f"  luminance moyenne = {sl/tot:.2f}")
    print(f"  densite d'encre (L>45) = {100*encre/tot:.2f} %")
    print(f"  couleur moyenne = ({sr//tot},{sg//tot},{sb//tot})   B-R = {(sb-sr)/tot:+.2f}")
    s=0
    print("  palette dominante :")
    for col,n in c.most_common(6):
        part=100*n/tot; s+=part
        print(f"    {str(col):18s} {part:6.2f} %   B-R={col[2]-col[0]:+3d}")
    print(f"  CONTROLE POSITIF somme des 6 premieres parts = {s:.1f} % (<=100) "
          f"-> {'OK' if s<=100.5 else 'ECHEC'}")
    print()
