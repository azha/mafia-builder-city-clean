# -*- coding: utf-8 -*-
"""CONTRASTES sur l'ART REEL : pour chaque texte, encre = mediane du top-decile,
fond = mediane des pixels de la boite QUI NE SONT PAS de l'encre (>1.5 CSS px du glyphe).
Doctrine du projet : >=3:1 grands textes, >=4.5:1 petits."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def mesure(im,c,label,x0,x1,y0,y1,petit=True):
    px=im.load()
    xa,xb,ya,yb=int(x0*c),int(x1*c),int(y0*c),int(y1*c)
    vals=[px[x,y] for y in range(ya,yb) for x in range(xa,xb)]
    lums=sorted(sum(p)/3.0 for p in vals)
    # fond = mediane du quartile le plus SOMBRE si l'encre est claire
    enc=[p for p in vals if sum(p)/3.0 >= lums[int(len(lums)*0.90)]]
    fon=[p for p in vals if sum(p)/3.0 <= lums[int(len(lums)*0.35)]]
    E=(int(statistics.median([p[0] for p in enc])),int(statistics.median([p[1] for p in enc])),int(statistics.median([p[2] for p in enc])))
    F=(int(statistics.median([p[0] for p in fon])),int(statistics.median([p[1] for p in fon])),int(statistics.median([p[2] for p in fon])))
    k=contrast(E,F); seuil=4.5 if petit else 3.0
    print(f"    {label:34s} encre={hexc(E)} fond={hexc(F)} -> {k:5.2f}:1  seuil {seuil}  {'OK' if k>=seuil else '*** SOUS LE SEUIL ***'}")
    return k

print("== CANON ==")
im=open_img(CANON); c=3.0
mesure(im,c,'ARGENT (libelle)',16,59,10,17.5)
mesure(im,c,'$ 24 850 (valeur)',17,80,20,34,False)
mesure(im,c,'JOUR 12 . SOIREE',277,376,13,22)
mesure(im,c,'21:40',330,376,26,40,False)
mesure(im,c,'libelles du dock',73,312,670,678)
mesure(im,c,'titre de la fiche',124,267,446,458,False)
mesure(im,c,'valeurs de la fiche',63,321,495,507,False)
mesure(im,c,'libelles de la fiche',51,337,517,525)
print("== CAP 1080x1920 ==")
im=open_img(CAP16); c=1080/392.
mesure(im,c,'ARGENT (libelle)',64,103,9,17.5)
mesure(im,c,'$10,000.00 (valeur)',46,140,22,38,False)
mesure(im,c,'JOUR 1',347,376,9,17.5)
mesure(im,c,'Aube',339,376,24,37,False)
mesure(im,c,'libelles du dock',73,311,669,676.5)
mesure(im,c,'  ACCUEIL seul',73,116,669,676.5)
mesure(im,c,'  FAMILLE seul',141,183,669,676.5)
mesure(im,c,'  FILIERE seul',210,250,669,676.5)
mesure(im,c,'  PLUS seul',286,311,669,676.5)
mesure(im,c,'titre de la fiche',179,213,444,458,False)
mesure(im,c,'valeurs de la fiche',51,322,495,510,False)
mesure(im,c,'libelles de la fiche',64,318,518,525)
mesure(im,c,'nom de district (Verge A)',5,40,78,90)
mesure(im,c,'Froid (medaillon)',182,210,44,53,False)
mesure(im,c,'CHALEUR (medaillon)',176,216,57,64)
print("== CAP 1080x2400 ==")
im=open_img(CAP24); c=1080/392.
mesure(im,c,'ARGENT (libelle)',64,103,9,17.5)
mesure(im,c,'$10,000.00 (valeur)',46,140,22,38,False)
mesure(im,c,'libelles du dock',73,311,843,851)
mesure(im,c,'nom de district (Verge A)',5,40,63,74)
mesure(im,c,'CHALEUR (medaillon)',176,216,57,64)
