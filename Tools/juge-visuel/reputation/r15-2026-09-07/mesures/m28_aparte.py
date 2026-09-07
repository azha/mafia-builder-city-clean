"""m28 — l'aparte « ce qu'il a absorbe de vos regles » : nombre de lignes et emprise.
Controle positif : le meme detecteur doit rendre 2 lignes sur « Pas encore / jugeable ».
Controle negatif : applique a une bande vide du panneau, il doit rendre 0 ligne.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def lignes(im,x0,x1,y0,y1,s=40):
    p=im.load()
    fond=mediane([lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1,2)])
    rows=[(y,sum(1 for x in range(x0,x1+1) if lum(p[x,y])>=fond+s)) for y in range(y0,y1+1)]
    return bandes(rows,6)
R=ouvrir('reference-1080x2102.png'); J=ouvrir('capture-1080x2400.png')
print("  REF  titre colonne droite x530..760 :", [(a,c) for a,c,_ in lignes(R,530,760,880,995)])
print("  REF  aparte             x765..1000 :", [(a,c) for a,c,_ in lignes(R,765,1000,880,995)])
print("  JEU  titre colonne droite x445..680 :", [(a,c) for a,c,_ in lignes(J,445,680,900,1000)])
print("  JEU  aparte             x690..1010 :", [(a,c) for a,c,_ in lignes(J,690,1010,900,1000)])
print("  [ctrl negatif] REF bande vide x765..1000 y1470..1520 :", [(a,c) for a,c,_ in lignes(R,765,1000,1470,1520)])
# largeur d'encre / epaisseur de trait : longueur MEDIANE des runs d'encre dans une bande
def trait(im,x0,x1,y0,y1,s=None):
    p=im.load()
    fond=mediane([lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1,2)])
    pic=max(lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1))
    seuil=fond+(pic-fond)*0.5
    runs=[]
    for y in range(y0,y1+1):
        n=0
        for x in range(x0,x1+1):
            if lum(p[x,y])>=seuil: n+=1
            else:
                if n: runs.append(n)
                n=0
        if n: runs.append(n)
    return mediane(runs), len(runs)
print()
print("  epaisseur de trait (longueur MEDIANE des runs horizontaux d'encre a mi-hauteur) :")
for lab,(im,x0,x1,y0,y1) in (("REF sous-titre (sans gras)",(R,140,930,586,610)),
                             ("JEU sous-titre (sans gras)",(J,150,930,622,646)),
                             ("REF titre panneau bas (serif)",(R,85,710,1720,1762)),
                             ("JEU titre panneau bas (serif)",(J,80,700,1656,1696)),
                             ("REF libelle CTA (sans gras)",(R,230,850,1983,2010)),
                             ("JEU libelle CTA (sans gras)",(J,230,850,1906,1940))):
    m,n=trait(im,x0,x1,y0,y1)
    print(f"    {lab:32s} : run median = {m:.1f} px  (n={n} runs)")
