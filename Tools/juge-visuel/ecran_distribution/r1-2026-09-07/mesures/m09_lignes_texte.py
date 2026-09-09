#!/usr/bin/env python3
# m09 — localisation des LIGNES de texte par profil d'encre, avant toute mesure.
# (la passe m08 a echoue son controle positif : fenetres y devinees. Ici on les TROUVE.)
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = Image.open(os.path.join(D,"reference-1080x2102.png")).convert('RGB')
CAP = Image.open(os.path.join(D,"capture-1080x2400.png")).convert('RGB')
print("OUVERT reference =", REF.size, " capture =", CAP.size)
def L(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]

def lignes(im, x0,y0,x1,y1, mode, seuil, nom):
    """mode 'clair' : encre plus claire que le fond ; 'sombre' : plus sombre."""
    px=im.load(); rows=[]
    for y in range(y0,y1):
        n=0
        for x in range(x0,x1):
            v=L(px[x,y])
            if (mode=='clair' and v>=seuil) or (mode=='sombre' and v<=seuil): n+=1
        rows.append((y,n))
    bandes=[]; cur=None
    for y,n in rows:
        if n>=2:
            if cur is None: cur=[y,y,n]
            else: cur[1]=y; cur[2]=max(cur[2],n)
        else:
            if cur is not None and cur[1]-cur[0]>=4: bandes.append(tuple(cur))
            cur=None
    if cur is not None and cur[1]-cur[0]>=4: bandes.append(tuple(cur))
    print(f"  {nom} : {len(bandes)} bande(s) d'encre")
    for a,b,n in bandes: print(f"      y {a:4d}..{b:4d}  h={b-a+1:3d} px = {(b-a+1)/3.6:5.2f} CSS  pic={n} px/ligne")
    return bandes

print("\n=== REFERENCE ===")
lignes(REF, 45,440, 1035,600, 'clair', 100, "entete (titre + sous-titre)")
lignes(REF, 300,700, 830,800, 'sombre', 120, "fiche gauche (texte sombre sur papier)")
lignes(REF, 45,1430,1035,1670,'clair', 90,  "bloc lecture")
lignes(REF, 190,1700,1035,1900,'clair', 90, "perso (nom/role/dit)")
lignes(REF, 60,1935,1035,2050,'clair', 90,  "geste")

print("\n=== CAPTURE ===")
lignes(CAP, 45,150, 1035,520, 'clair', 100, "entete (titre + sous-titre)")
lignes(CAP, 300,580, 810,700, 'sombre', 120, "fiche haute")
lignes(CAP, 45,960, 1035,1200,'clair', 90,  "bloc lecture")
lignes(CAP, 45,1200,1035,1700,'clair', 90,  "VOS COURRIERS + rangees + bouton")
lignes(CAP, 170,1700,1035,1900,'clair', 90, "perso (nom/role)")
lignes(CAP, 45,1890,1035,2110,'sombre',120, "CTA (texte sombre sur or)")
lignes(CAP, 45,2050,1035,2110,'clair', 90,  "legende sous CTA")
