# -*- coding: utf-8 -*-
"""04 - Profil BRUT (non seuille) des rails du cadre interne, et repetition sur les 4 cartes.
Un 9-slice etire produit le MEME trou, aux MEMES coordonnees relatives, sur toutes les instances.
CONTROLE POSITIF : le bord GAUCHE de la boite (un montant) doit etre trouve a la meme abscisse
sur les 4 cartes. CONTROLE NEGATIF : une ligne prise 20 px SOUS le rail (interieur vide) doit
rendre un maximum proche du fond."""
from PIL import Image
im = Image.open('../capture-1080x2400.png').convert('RGB'); print("ouvert", im.size)
px = im.load()
def L(x,y):
    r,g,b=px[x,y]; return 0.2126*r+0.7152*g+0.0722*b

def maxband(y0,y1,x):  return max(L(x,y) for y in range(y0,y1))

# 1) trouver le rail haut de la boite 1 en balayant y
print("--- localisation verticale du rail haut, x=200 (zone pleine) ---")
for y in range(725,750):
    print("   y=%d  L=%.1f" % (y, L(200,y)))

print("--- profil BRUT du rail haut (y=733..737), boite 1 ---")
prof=[max(L(x,y) for y in range(733,738)) for x in range(50,1070)]
# resume par tranches de 20 px
for i in range(0,len(prof),20):
    seg=prof[i:i+20]
    print("   x=%4d..%4d  max=%5.1f  min=%5.1f" % (50+i, 50+i+len(seg)-1, max(seg), min(seg)))
