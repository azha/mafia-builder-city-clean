# -*- coding: utf-8 -*-
"""m24 — hauteur de capitale du sous-titre, sur une portion SANS accent ni apostrophe
(les deux marques montent au-dessus de la capitale et faussaient m23).
REF : "UN LIEUTENANT"   CAP : "PERSONNE NE VOUS A ENCORE"  (l'E accentue de JUGE exclu).
Contrôle positif : la meme sonde sur "REGLES DONNEES" (chaine identique des deux cotes)
  doit rendre la meme hauteur — m08 mesurait 18/19 px.
Contrôle négatif : la meme sonde 30 px plus haut (dans l'aplat) doit rendre 'aucune ligne'.
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def bande(im,x0,x1,y0,y1,s,nom):
    px=im.load();ys=[]
    for y in range(y0,y1):
        if sum(1 for x in range(x0,x1) if lum(px[x,y])>=s)>=3: ys.append(y)
    if not ys: print('   %-34s AUCUNE ligne'%nom); return None
    print('   %-34s y=%d..%d  hauteur=%d px (%.2f CSS)'%(nom,min(ys),max(ys),max(ys)-min(ys)+1,(max(ys)-min(ys)+1)/3.6))
    return max(ys)-min(ys)+1
a=bande(R,148,430,580,650,70,'REF sous-titre "UN LIEUTENANT"')
b=bande(C,195,830,385,445,70,'CAP sous-titre "PERSONNE...ENCORE"')
print('   => ecart %+.1f%%'%(100*(b-a)/a))
print('   contrôle positif (chaine identique) :')
bande(R,88,321,778,802,70,'REF "REGLES DONNEES"')
bande(C,87,321,568,596,70,'CAP "REGLES DONNEES"')
print('   contrôle négatif (aplat 30 px plus haut) :')
bande(R,148,430,545,572,70,'REF aplat')
bande(C,195,830,355,382,70,'CAP aplat')
