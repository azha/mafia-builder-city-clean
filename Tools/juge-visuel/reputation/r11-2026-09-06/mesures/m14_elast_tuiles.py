#!/usr/bin/env python3
"""m14 - le panneau elastique : carte portrait, pile de 4 tuiles, vide en pied.
Tout en coordonnees LOCALES du cadre (origine = coin haut-gauche du filet or).
Encre = pixel dont la luminance s'ecarte de >6 du fond local du panneau
(mediane de la colonne dans une bande vide connue).
Controle positif : la carte portrait doit ressortir aux memes bornes que m13.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAD={'reference-1080x2102.png':(21,452),'capture-1080x2400.png':(18,482)}
ELAST={'reference-1080x2102.png':(396,1161),'capture-1080x2400.png':(392,1175)}
for f,(X0,Y0) in CAD.items():
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    e0,e1=ELAST[f]
    print(f'=== {f} taille={im.size}  .elast local {e0}..{e1}  h={e1-e0+1}')
    # colonne de droite = celle des tuiles : x local 480..1000 -> absolu
    # fond du panneau : mediane des px de la bande locale e1-30..e1-10
    fond=statistics.median([lum(px[X0+x, Y0+y]) for y in range(e1-28,e1-8) for x in range(500,1000,3)])
    print(f'  fond du panneau (bande locale {e1-28}..{e1-8}, colonne droite) : lum {fond:.1f}')
    def derniere_encre(xa,xb):
        for y in range(e1-4, e0, -1):
            n=sum(1 for x in range(xa,xb) if abs(lum(px[X0+x,Y0+y])-fond)>6)
            if n>=6: return y,n
        return None,0
    yd,n = derniere_encre(500,1000)
    print(f'  colonne DROITE (tuiles) : derniere rangee d encre local y={yd} ({n} px) '
          f'-> vide en pied = {e1-yd} px')
    yg,ng = derniere_encre(40,470)
    print(f'  colonne GAUCHE (carte)  : derniere rangee d encre local y={yg} ({ng} px) '
          f'-> vide en pied = {e1-yg} px')
    # premiere rangee d encre dans la colonne droite
    for y in range(e0+2, e1):
        n=sum(1 for x in range(500,1000) if abs(lum(px[X0+x,Y0+y])-fond)>6)
        if n>=6: print(f'  colonne DROITE : premiere rangee d encre local y={y} ({n} px)'); break
